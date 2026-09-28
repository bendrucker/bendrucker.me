import { beforeEach, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import { queryRideById } from "@/activity/feed";
import { publishActivity, type PublishedActivity } from "@/activity/publish";
import type { Database } from "@/db";
import { createTestDb, testStore } from "@/test/db";
import {
  likePattern,
  MATCH_COUNT,
  queryRideIndex,
  queryRideRowsPage,
  queryRidesPage,
} from "./query";
import { rideRowsPage } from "./rows";

/** Google's documented polyline example. */
const GOOGLE_EXAMPLE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

let db: Kysely<Database>;

beforeEach(() => {
  db = createTestDb();
});

function ride(
  activityId: string,
  overrides: Partial<PublishedActivity> = {},
): PublishedActivity {
  return {
    activityId,
    stravaId: activityId,
    name: `Ride ${activityId}`,
    sport: "ride",
    startedAt: "2026-09-20T15:00:00Z",
    timezone: "America/Los_Angeles",
    distanceM: 40_000,
    movingS: 5_400,
    elevationM: 600,
    averageWatts: 200,
    powerSource: "measured",
    polyline: null,
    elevationProfile: null,
    photoKeys: [],
    ...overrides,
  };
}

async function seed(...rides: PublishedActivity[]) {
  const store = testStore(db);
  for (const row of rides) await publishActivity(store, row);
}

describe("queryRidesPage", () => {
  it("renders an empty feed as nothing at all", async () => {
    expect(await queryRidesPage(db)).toEqual({
      latestDay: null,
      highlights: [],
      months: [],
      logCursor: null,
      records: { longest: [], climbing: [] },
      matchRecords: null,
      routes: [],
      matches: null,
      partial: false,
    });
  });

  it("logs the latest ride's month and the one before, commutes included", async () => {
    await seed(
      ride("sep", { startedAt: "2026-09-20T15:00:00Z" }),
      ride("commute", { startedAt: "2026-09-18T15:00:00Z", distanceM: 4_000 }),
      ride("aug", { startedAt: "2026-08-02T15:00:00Z" }),
      ride("june", { startedAt: "2026-06-10T15:00:00Z" }),
    );

    const page = await queryRidesPage(db);

    expect(page.latestDay).toBe("2026-09-20");
    expect(page.months.map((month) => month.key)).toEqual([
      "2026-09",
      "2026-08",
    ]);
    expect(page.months[0]?.rides.map(([id]) => id)).toEqual(["sep", "commute"]);
    expect(page.logCursor).toBe("2026-07");
  });

  it("files a ride under its local day", async () => {
    // 01:30 UTC on the 1st is still the 31st in Los Angeles.
    await seed(ride("late", { startedAt: "2026-09-01T01:30:00Z" }));

    const page = await queryRidesPage(db);

    expect(page.latestDay).toBe("2026-08-31");
    expect(page.months[0]?.key).toBe("2026-08");
  });

  it("highlights the big rides of the last ninety days, biggest first", async () => {
    await seed(
      ride("long", { startedAt: "2026-09-10T15:00:00Z", distanceM: 120_000 }),
      ride("steep", { startedAt: "2026-08-10T15:00:00Z", elevationM: 2_400 }),
      ride("short", { startedAt: "2026-09-12T15:00:00Z" }),
      ride("old", { startedAt: "2026-05-01T15:00:00Z", distanceM: 200_000 }),
      ride("latest", { startedAt: "2026-09-20T15:00:00Z" }),
    );

    const page = await queryRidesPage(db);

    expect(page.highlights.map(([id]) => id)).toEqual(["steep", "long"]);
  });

  it("keeps all-time records whatever the window", async () => {
    await seed(
      ride("latest"),
      ride("old", { startedAt: "2019-05-01T15:00:00Z", distanceM: 200_000 }),
      ride("hill", { startedAt: "2020-05-01T15:00:00Z", elevationM: 3_000 }),
    );

    const { records } = await queryRidesPage(db);

    expect(records.longest.map(([id]) => id)).toEqual([
      "old",
      "latest",
      "hill",
    ]);
    expect(records.climbing[0]).toEqual([
      "hill",
      "Ride hill",
      "2020-05-01",
      40_000,
      3_000,
    ]);
  });

  it("draws one tile per named big route, newest ride first", async () => {
    const big = { distanceM: 100_000, polyline: GOOGLE_EXAMPLE };
    await seed(
      ride("a1", {
        ...big,
        name: "Paradise Loop",
        startedAt: "2026-09-01T15:00:00Z",
      }),
      ride("a2", {
        ...big,
        name: "Paradise Loop",
        startedAt: "2026-09-10T15:00:00Z",
      }),
      ride("a3", {
        name: "Paradise Loop",
        startedAt: "2026-09-12T15:00:00Z",
        polyline: GOOGLE_EXAMPLE,
      }),
      ride("b", {
        name: "Mt. Tam",
        startedAt: "2026-09-05T15:00:00Z",
        polyline: GOOGLE_EXAMPLE,
        elevationM: 1_500,
      }),
      ride("coffee", {
        name: "Coffee ride",
        startedAt: "2026-09-14T15:00:00Z",
        polyline: GOOGLE_EXAMPLE,
      }),
      ride("morning", {
        ...big,
        name: "Morning Ride",
        startedAt: "2026-09-15T15:00:00Z",
      }),
      ride("trackless", { ...big, name: "Trainer", polyline: null }),
    );

    const { routes } = await queryRidesPage(db);

    // The short lap of Paradise Loop on the 12th is not the tile's ride, and
    // the coffee ride is not a route at all.
    expect(routes.map(([id]) => id)).toEqual(["a2", "b"]);
    expect(routes[0]?.[5]).toMatch(/^M[\d.]+ [\d.]+(L[\d.]+ [\d.]+)+$/);
  });

  it("narrows matches and their records to the query", async () => {
    await seed(
      ride("hit", {
        name: "Paradise Loop",
        distanceM: 60_000,
        elevationM: 1_500,
        polyline: GOOGLE_EXAMPLE,
      }),
      ride("miss", {
        name: "Mt. Tam",
        distanceM: 90_000,
        polyline: GOOGLE_EXAMPLE,
      }),
    );

    const page = await queryRidesPage(db, "paradise");

    expect(page.matches?.map(([id]) => id)).toEqual(["hit"]);
    expect(page.partial).toBe(false);
    expect(page.matchRecords?.longest.map(([id]) => id)).toEqual(["hit"]);
    expect(page.records.longest.map(([id]) => id)).toEqual(["miss", "hit"]);
    // The grid stays whole for the browser to filter.
    expect(page.routes).toHaveLength(2);
  });

  it("reports a partial match list past the first screen", async () => {
    const rides = Array.from({ length: MATCH_COUNT + 1 }, (_, index) =>
      ride(`r${index}`, {
        name: "Loop",
        startedAt: new Date(
          Date.UTC(2026, 8, 1) + index * 3_600_000,
        ).toISOString(),
      }),
    );
    await seed(...rides);

    const page = await queryRidesPage(db, "loop");

    expect(page.matches).toHaveLength(MATCH_COUNT);
    expect(page.partial).toBe(true);
  });
});

describe("likePattern", () => {
  it("escapes the wildcards a name can hold", () => {
    expect(likePattern(" 100% _fun_ ")).toBe(String.raw`%100\% \_fun\_%`);
  });

  it("matches a literal percent and nothing else", async () => {
    await seed(
      ride("pct", { name: "100% effort" }),
      ride("other", { name: "100 effort" }),
    );

    const page = await queryRidesPage(db, "100%");

    expect(page.matches?.map(([id]) => id)).toEqual(["pct"]);
  });
});

describe("queryRideRowsPage", () => {
  it("pages the months before the cursor and parses as a rows page", async () => {
    await seed(
      ride("july", { startedAt: "2026-07-10T15:00:00Z" }),
      ride("feb", { startedAt: "2026-02-10T15:00:00Z" }),
      ride("old", { startedAt: "2024-11-10T15:00:00Z" }),
    );

    const page = await queryRideRowsPage(db, "2026-08");

    expect(page.months.map((month) => month.key)).toEqual([
      "2026-07",
      "2026-02",
    ]);
    expect(page.logCursor).toBe("2024-12");
    const body = JSON.stringify(page);
    expect(rideRowsPage.parse(JSON.parse(body))).toEqual(page);
  });
});

describe("queryRideIndex", () => {
  it("lists every ride newest first", async () => {
    await seed(
      ride("older", { startedAt: "2020-01-01T20:00:00Z" }),
      ride("newer"),
    );

    expect((await queryRideIndex(db)).map(([id]) => id)).toEqual([
      "newer",
      "older",
    ]);
  });
});

describe("queryRideById", () => {
  it("reads one ride with its track", async () => {
    await seed(ride("one", { polyline: GOOGLE_EXAMPLE }));

    const found = await queryRideById(db, "one");

    expect(found?.ride.id).toBe("one");
    expect(found?.ride.route).toBe(GOOGLE_EXAMPLE);
    expect(found?.distanceM).toBe(40_000);
    expect(found?.elevationM).toBe(600);
  });

  it("returns null for an id no ride carries", async () => {
    await seed(ride("one"));

    expect(await queryRideById(db, "two")).toBeNull();
  });
});
