import { beforeEach, describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import { queryRideById } from "@/activity/feed";
import {
  publishActivity,
  publishPowerCurve,
  type PublishedActivity,
} from "@/activity/publish";
import type { Database } from "@/db";
import { createTestDb, noClimbNames, testStore } from "@/test/db";
import {
  foldsLikeBrowser,
  MATCH_COUNT,
  queryRideHighlights,
  queryRideIndex,
  queryRideRecords,
  queryRideRowsPage,
  queryRidesPage,
} from "./query";
import { pickRecords, recordsPage, type PeriodRecords } from "./records";
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
    description: null,
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
  for (const row of rides) await publishActivity(store, row, noClimbNames);
}

describe("queryRidesPage", () => {
  it("renders an empty feed as nothing at all", async () => {
    expect(await queryRidesPage(db)).toEqual({
      latestDay: null,
      highlights: [],
      months: [],
      logCursor: null,
      matchRecords: null,
      matches: null,
      partial: false,
      monthKeys: [],
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

describe("search", () => {
  it("matches a literal percent and nothing else", async () => {
    await seed(
      ride("pct", { name: "100% effort" }),
      ride("other", { name: "100 effort" }),
      ride("under", { name: "100_effort" }),
    );

    const page = await queryRidesPage(db, "100%");

    expect(page.matches?.map(([id]) => id)).toEqual(["pct"]);
  });

  it("finds a ride by its whole name, however long", async () => {
    const name =
      "Ask your doctor if you experience fresh legs as it may be a sign";
    await seed(ride("long", { name }), ride("other"));

    const page = await queryRidesPage(db, name.toUpperCase());

    expect(page.matches?.map(([id]) => id)).toEqual(["long"]);
    expect(page.matchRecords?.longest.map(([id]) => id)).toEqual(["long"]);
  });

  it("matches an unnamed ride by the name its row shows", async () => {
    await seed(ride("unnamed", { name: null }), ride("named"));

    const page = await queryRidesPage(db, "ride");

    expect(page.matches?.map(([id]) => id)).toEqual(
      expect.arrayContaining(["unnamed", "named"]),
    );
  });

  it("matches a description and carries it on the row", async () => {
    await seed(
      ride("fog", { description: "In the fog, above the fog" }),
      ride("clear"),
    );

    const page = await queryRidesPage(db, "FOG");

    expect(page.matches).toEqual([
      [
        "fog",
        "Ride fog",
        "2026-09-20",
        40_000,
        600,
        "In the fog, above the fog",
      ],
    ]);
    const lengths = page.months[0]?.rides.map((row) => row.length);
    expect(lengths?.toSorted((a, b) => a - b)).toEqual([5, 6]);
  });

  it("leaves a query SQLite can't fold for the browser to finish", async () => {
    await seed(ride("cafe", { name: "Café" }));

    const ascii = await queryRidesPage(db, "CAF");
    const accented = await queryRidesPage(db, "CAFÉ");

    expect(ascii.partial).toBe(false);
    expect(accented.partial).toBe(true);
  });
});

describe("foldsLikeBrowser", () => {
  it("holds for printable ASCII only", () => {
    expect(foldsLikeBrowser(" Mt. Tam 100% ")).toBe(true);
    expect(foldsLikeBrowser("café")).toBe(false);
  });
});

describe("figures", () => {
  it("leaves a figure the ride never recorded as null", async () => {
    await seed(ride("bare", { distanceM: null, elevationM: null }));

    const page = await queryRidesPage(db);

    expect(page.months[0]?.rides[0]).toEqual([
      "bare",
      "Ride bare",
      "2026-09-20",
      null,
      null,
    ]);
  });
});

function period(periods: PeriodRecords[], name: string) {
  const found = periods.find((records) => records.period === name);
  if (found === undefined) throw new Error(`No period ${name}`);
  return found;
}

function ids(tuples: readonly (readonly unknown[])[]) {
  return tuples.map((tuple) => tuple[0]);
}

async function curve(id: string, watts: Record<number, number>) {
  await publishPowerCurve(
    testStore(db),
    id,
    Object.entries(watts).map(([durationS, value]) => ({
      durationS: Number(durationS),
      watts: value,
    })),
  );
}

describe("queryRideRecords", () => {
  it("has no periods before the first ride", async () => {
    expect(await queryRideRecords(db)).toEqual([]);
  });

  it("ranks all time, then each year newest first", async () => {
    await seed(
      ride("latest"),
      ride("old", { startedAt: "2019-05-01T15:00:00Z", distanceM: 200_000 }),
      ride("hill", { startedAt: "2020-05-01T15:00:00Z", elevationM: 3_000 }),
      ride("short", {
        startedAt: "2020-06-01T15:00:00Z",
        distanceM: 30_000,
      }),
    );

    const periods = await queryRideRecords(db);

    expect(periods.map((records) => records.period)).toEqual([
      "all",
      "2026",
      "2020",
      "2019",
    ]);
    const all = period(periods, "all");
    expect(ids(all.longest)).toEqual(["old", "latest", "hill", "short"]);
    expect(all.climbing[0]).toEqual([
      "hill",
      "Ride hill",
      "2020-05-01",
      40_000,
      3_000,
    ]);
    expect(ids(period(periods, "2020").longest)).toEqual(["hill", "short"]);
    expect(ids(period(periods, "2019").longest)).toEqual(["old"]);
  });

  it("names the five leaders of each list", async () => {
    await seed(
      ...Array.from({ length: 8 }, (_, index) =>
        ride(`r${index}`, {
          startedAt: `2026-0${index + 1}-10T15:00:00Z`,
          distanceM: 10_000 * (index + 1),
        }),
      ),
    );

    const all = period(await queryRideRecords(db), "all");

    expect(ids(all.longest)).toEqual(["r7", "r6", "r5", "r4", "r3"]);
  });

  it("files a ride under the year it was local, not UTC", async () => {
    // Late on New Year's Eve in California is already January in UTC.
    await seed(
      ride("eve", {
        startedAt: "2026-01-01T06:00:00Z",
        distanceM: 150_000,
      }),
      ride("summer", { startedAt: "2026-07-01T15:00:00Z" }),
      ...Array.from({ length: 6 }, (_, index) =>
        ride(`y${index}`, {
          startedAt: `2025-0${index + 1}-10T15:00:00Z`,
          distanceM: 160_000 + index,
        }),
      ),
    );

    const periods = await queryRideRecords(db);

    expect(ids(period(periods, "2026").longest)).toEqual(["summer"]);
    // The eve ride trails five 2025 rides, and still makes 2025's list.
    expect(ids(period(periods, "2025").longest)).toEqual([
      "y5",
      "y4",
      "y3",
      "y2",
      "y1",
    ]);
    expect(
      ids(
        period(periods, "2025").longest.concat(
          period(periods, "2025").climbing,
        ),
      ),
    ).toContain("eve");
  });

  it("keeps indoor rides and manual entries out of every list", async () => {
    await seed(
      ride("road", { elevationM: 2_000 }),
      ride("zwift", {
        startedAt: "2026-09-19T15:00:00Z",
        distanceM: 90_000,
        elevationM: 1_600,
        movingS: 12_000,
        indoor: true,
      }),
      ride("tally", {
        startedAt: "2026-09-18T15:00:00Z",
        distanceM: 0,
        movingS: 0,
        elevationM: 30_000,
      }),
    );
    await curve("road", { 60: 400 });
    await curve("zwift", { 60: 500 });

    for (const records of await queryRideRecords(db)) {
      expect(ids(records.longest)).toEqual(["road"]);
      expect(ids(records.climbing)).toEqual(["road"]);
      expect(records.power).toEqual([
        [60, 400, "road", "Ride road", "2026-09-20"],
      ]);
    }
  });

  it("ranks outdoor rides' climbs under the ride's local day", async () => {
    await seed(
      ride("road", { name: "Diablo loop" }),
      ride("zwift", { startedAt: "2026-09-19T15:00:00Z", indoor: true }),
    );
    await db
      .insertInto("activityClimb")
      .values(
        [
          ["road", 0, 850.4, "Mount Diablo"],
          ["road", 1, 300, null],
          ["zwift", 0, 1_500, "Alpe du Zwift"],
        ].map(([activityId, position, gainM, name]) => ({
          activityId: String(activityId),
          position: Number(position),
          gainM: Number(gainM),
          summitLat: 37.88,
          summitLng: -121.91,
          name: name === null ? null : String(name),
        })),
      )
      .execute();

    const all = period(await queryRideRecords(db), "all");

    expect(all.climbs).toEqual([
      ["road", 0, "Mount Diablo", "Diablo loop", "2026-09-20", 850],
      ["road", 1, null, "Diablo loop", "2026-09-20", 300],
    ]);
  });

  it("takes power from a meter only, the best of each duration", async () => {
    await seed(
      ride("meter"),
      ride("older", { startedAt: "2025-05-01T15:00:00Z" }),
      ride("guess", {
        startedAt: "2026-09-19T15:00:00Z",
        powerSource: "estimated",
        averageWatts: 400,
      }),
    );
    await curve("meter", { 5: 900, 60: 450.4, 1200: 280, 30: 700 });
    await curve("older", { 60: 480, 3600: 250 });
    await curve("guess", { 5: 1_500, 60: 999 });

    const periods = await queryRideRecords(db);

    expect(period(periods, "all").power).toEqual([
      [5, 900, "meter", "Ride meter", "2026-09-20"],
      [60, 480, "older", "Ride older", "2025-05-01"],
      [1200, 280, "meter", "Ride meter", "2026-09-20"],
      [3600, 250, "older", "Ride older", "2025-05-01"],
    ]);
    expect(
      period(periods, "2026").power.map(([durationS, watts]) => [
        durationS,
        watts,
      ]),
    ).toEqual([
      [5, 900],
      [60, 450],
      [1200, 280],
    ]);
  });

  it("answers a period with the list of every period", async () => {
    await seed(ride("a"), ride("b", { startedAt: "2024-05-01T15:00:00Z" }));

    const periods = await queryRideRecords(db);

    const page = pickRecords(periods, "2024");
    expect(page?.periods).toEqual(["all", "2026", "2024"]);
    expect(page?.records.period).toBe("2024");
    expect(recordsPage.parse(structuredClone(page))).toEqual(page);
    expect(pickRecords(periods, "2025")).toBeNull();
    expect(pickRecords([], "all")).toEqual({
      periods: ["all"],
      records: {
        period: "all",
        power: [],
        longest: [],
        climbing: [],
        climbs: [],
      },
    });
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
    expect(found?.description).toBeNull();
  });

  it("reads the description the page shows as its dek", async () => {
    await seed(ride("tam", { description: "MV FF BF SB RRG" }));

    expect((await queryRideById(db, "tam"))?.description).toBe(
      "MV FF BF SB RRG",
    );
  });

  it("keeps a figure the ride never recorded as null", async () => {
    await seed(ride("bare", { distanceM: null, elevationM: null }));

    const found = await queryRideById(db, "bare");

    expect(found?.distanceM).toBeNull();
    expect(found?.elevationM).toBeNull();
  });

  it("returns null for an id no ride carries", async () => {
    await seed(ride("one"));

    expect(await queryRideById(db, "two")).toBeNull();
  });
});

describe("queryRideHighlights", () => {
  it("is empty for an empty feed", async () => {
    expect(await queryRideHighlights(db)).toEqual([]);
  });

  it("picks the same rides as the route's highlights", async () => {
    await seed(
      ride("long", { startedAt: "2026-09-10T15:00:00Z", distanceM: 120_000 }),
      ride("steep", { startedAt: "2026-08-10T15:00:00Z", elevationM: 2_400 }),
      ride("short", { startedAt: "2026-09-12T15:00:00Z" }),
      ride("old", { startedAt: "2026-05-01T15:00:00Z", distanceM: 200_000 }),
    );

    const rows = await queryRideHighlights(db);
    const page = await queryRidesPage(db);

    expect(rows.map((row) => row.id)).toEqual(["steep", "long"]);
    expect(rows.map((row) => row.id)).toEqual(
      page.highlights.map(([id]) => id),
    );
  });
});
