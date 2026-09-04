import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import type { Kysely } from "kysely";
import { activity as fixture } from "@/components/cycling/fixtures";
import type { Database } from "@/db";
import { createTestDb, testStore } from "@/test/db";
import {
  buildCyclingActivity,
  queryCyclingActivity,
  queryCyclingLogPage,
  readFeedVersion,
} from "./feed";
import { decodePolyline, decodeProfile } from "./track";
import {
  deleteActivity,
  publishActivity,
  publishPowerCurve,
  type PublishedActivity,
} from "./publish";
import type { ActivityStore } from "./store";
import type { CyclingActivityData } from "./types";

/** Google's documented polyline example. */
const GOOGLE_EXAMPLE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

const NOW = new Date("2026-08-15T12:00:00Z");

let db: Kysely<Database>;
let store: ActivityStore;

beforeEach(() => {
  db = createTestDb();
  store = testStore(db);
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
    startedAt: "2026-07-11T13:00:55Z",
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
  for (const row of rides) await publishActivity(store, row);
}

describe("queryCyclingActivity", () => {
  it("renders an empty feed as an empty year", async () => {
    const data = await queryCyclingActivity(db, NOW);

    expect(data).toEqual({
      totals: { year: 2026, distanceMi: 0, elevationFt: 0, rideCount: 0 },
      months: [],
      highlightMonths: [],
      records: [],
      logCursor: null,
    });
  });

  it("groups a month's rides newest first and footnotes its commutes", async () => {
    await seed(
      ride("long", { startedAt: "2026-07-04T13:00:00Z", distanceM: 160_934 }),
      ride("hilly", { startedAt: "2026-07-18T13:00:00Z", elevationM: 2_000 }),
      ride("commute", { startedAt: "2026-07-20T13:00:00Z", distanceM: 6_000 }),
    );

    const { months, totals } = await queryCyclingActivity(db, NOW);

    expect(months).toHaveLength(1);
    const [july] = months;
    expect(july).toMatchObject({
      key: "2026-07",
      label: "july 2026",
      rideCount: 3,
      commuteCount: 1,
      distanceMi: 128.58,
      elevationFt: 10499,
    });
    expect(july!.rides.map((entry) => entry.id)).toEqual(["hilly", "long"]);
    expect(totals).toEqual({
      year: 2026,
      distanceMi: 128.58,
      elevationFt: 10499,
      rideCount: 3,
    });
  });

  it("splits months across the year boundary and qualifies the totals", async () => {
    await seed(
      ride("dec", { startedAt: "2025-12-14T17:00:00Z" }),
      ride("jan", { startedAt: "2026-01-03T17:00:00Z" }),
    );

    const { months, totals } = await queryCyclingActivity(db, NOW);

    expect(months.map((month) => month.key)).toEqual(["2026-01", "2025-12"]);
    expect(totals).toEqual({
      year: 2026,
      distanceMi: 24.85,
      elevationFt: 1969,
      rideCount: 1,
      note: "ride in 2026",
    });
  });

  it("reads the ride's wall clock in its own timezone", async () => {
    await seed(
      ride("a", {
        startedAt: "2026-07-11T05:30:00Z",
        timezone: "America/Los_Angeles",
      }),
      ride("b", { startedAt: "2026-07-11T05:30:00Z", timezone: "Asia/Tokyo" }),
    );

    const { months } = await queryCyclingActivity(db, NOW);
    const startedAt = new Map(
      months.flatMap((month) => month.rides).map((r) => [r.id, r.startedAt]),
    );
    expect(startedAt.get("a")).toBe("2026-07-10T22:30:00");
    expect(startedAt.get("b")).toBe("2026-07-11T14:30:00");
  });

  it("orders the log by local date across a year boundary", async () => {
    await seed(
      // 08:00 on 1 January in Tokyo, still 31 December in UTC.
      ride("tokyo", {
        startedAt: "2025-12-31T23:00:00Z",
        timezone: "Asia/Tokyo",
      }),
      // 20:00 on 31 December in Los Angeles, already 1 January in UTC.
      ride("la", {
        startedAt: "2026-01-01T04:00:00Z",
        timezone: "America/Los_Angeles",
      }),
    );

    const { months, totals } = await queryCyclingActivity(db, NOW);
    expect(months.map((month) => month.key)).toEqual(["2026-01", "2025-12"]);
    expect(totals.year).toBe(2026);
  });

  it("logs the last twelve months and ranks every ride", async () => {
    await seed(
      ride("latest", { startedAt: "2026-07-11T13:00:55Z", distanceM: 10_000 }),
      ride("edge", { startedAt: "2025-08-01T13:00:55Z", distanceM: 20_000 }),
      ride("old", { startedAt: "2025-07-31T13:00:55Z", distanceM: 30_000 }),
    );

    const { months, records } = await queryCyclingActivity(db, NOW);
    expect(months.map((month) => month.key)).toEqual(["2026-07", "2025-08"]);
    const distance = records
      .find((period) => period.period === "all")!
      .lists.find((list) => list.metric === "distance")!;
    expect(distance.rows.map((row) => row.id)).toEqual([
      "old",
      "edge",
      "latest",
    ]);
  });

  it("thins a full-resolution route and profile to what a card draws", async () => {
    // Each repeat re-encodes the same deltas, so the string stays decodable.
    const polyline = GOOGLE_EXAMPLE.repeat(400);
    const full = decodePolyline(polyline);
    await seed(
      ride("long", {
        polyline,
        elevationProfile: Array.from({ length: 1000 }, (_, i) => i),
      }),
    );

    const [ride1] = (await queryCyclingActivity(db, NOW)).months[0]!.rides;
    const route = decodePolyline(ride1!.route!);
    const profile = decodeProfile(ride1!.elevationProfile!);
    expect(full.length).toBe(1200);
    expect(route.length).toBeLessThanOrEqual(301);
    expect(route[0]).toEqual(full[0]);
    expect(route.at(-1)).toEqual(full.at(-1));
    expect(profile.length).toBeLessThanOrEqual(101);
    expect(profile[0]).toBe(0);
    expect(profile.at(-1)).toBe(1);
  });

  it("falls back to UTC for a timezone the runtime does not know", async () => {
    await seed(
      ride("a", { startedAt: "2026-07-11T05:30:00Z", timezone: "Not/AZone" }),
    );

    const { months } = await queryCyclingActivity(db, NOW);
    expect(months[0]!.rides[0]!.startedAt).toBe("2026-07-11T05:30:00");
  });

  it("carries a ride with only the registry fields", async () => {
    await seed(
      ride("bare", {
        stravaId: null,
        name: null,
        distanceM: null,
        movingS: 1_800,
        elevationM: null,
        averageWatts: null,
        powerSource: "none",
      }),
    );

    const { months, records } = await queryCyclingActivity(db, NOW);

    expect(months[0]!.rides[0]).toEqual({
      id: "bare",
      name: "Ride",
      startedAt: "2026-07-11T06:00:55",
      movingSeconds: 1_800,
      photos: [],
      badges: [],
      facts: [],
    });
    expect(records[0]!.lists.map((list) => list.id)).toEqual(["duration"]);
    expect(records[0]!.lists[0]!.rows[0]).toEqual({
      id: "bare",
      name: "Ride",
      detail: "'26",
      value: 1_800,
    });
  });

  it("leaves absent JSON columns absent and passes present ones through", async () => {
    await seed(
      ride("plain"),
      ride("full", {
        elevationProfile: [100, 150, 200, 100],
        photoKeys: [
          "raw/strava/activities/1/photos/a.jpg",
          "raw/strava/activities/1/photos/b.jpg",
        ],
      }),
    );

    const rides = (await queryCyclingActivity(db, NOW)).months[0]!.rides;
    const byId = new Map(rides.map((entry) => [entry.id, entry]));

    expect(byId.get("plain")).not.toHaveProperty("elevationProfile");
    expect(byId.get("plain")!.photos).toEqual([]);

    const profile = decodeProfile(byId.get("full")!.elevationProfile!);
    expect(profile[0]).toBe(0);
    // The midpoint lands on the nearest of the 256 levels a sample encodes to.
    expect(profile[1]).toBeCloseTo(0.5, 2);
    expect(profile[2]).toBe(1);
    expect(profile[3]).toBe(0);
    expect(byId.get("full")!.photos).toEqual([
      {
        id: "raw/strava/activities/1/photos/a.jpg",
        thumbnailUrl: "/photos/raw/strava/activities/1/photos/a.jpg",
        fullUrl: "/photos/raw/strava/activities/1/photos/a.jpg",
        alt: "Photo 1 from Ride full",
      },
      {
        id: "raw/strava/activities/1/photos/b.jpg",
        thumbnailUrl: "/photos/raw/strava/activities/1/photos/b.jpg",
        fullUrl: "/photos/raw/strava/activities/1/photos/b.jpg",
        alt: "Photo 2 from Ride full",
      },
    ]);
  });

  it("decodes the polyline into a route", async () => {
    await seed(ride("mapped", { polyline: GOOGLE_EXAMPLE }));

    const [mapped] = (await queryCyclingActivity(db, NOW)).months[0]!.rides;

    const route = decodePolyline(mapped!.route!);
    expect(route).toHaveLength(3);
    expect(route[0]![0]).toBeCloseTo(38.5, 5);
    expect(route[0]![1]).toBeCloseTo(-120.2, 5);
    expect(mapped!.stravaUrl).toBe("https://www.strava.com/activities/mapped");
  });

  it("badges and highlights a month's longest and hilliest rides", async () => {
    await seed(
      ride("long", { distanceM: 100_000, elevationM: 500 }),
      ride("hilly", { distanceM: 50_000, elevationM: 2_000 }),
      ride("short", { distanceM: 30_000, elevationM: 300 }),
    );

    const { months, highlightMonths } = await queryCyclingActivity(db, NOW);
    const badges = new Map(
      months[0]!.rides.map((r) => [r.id, r.badges.map((b) => b.kind)]),
    );

    expect(badges.get("long")).toEqual(["longest"]);
    expect(badges.get("hilly")).toEqual(["most-climbing"]);
    expect(badges.get("short")).toEqual([]);
    expect(highlightMonths).toHaveLength(1);
    expect(
      highlightMonths[0]!.highlights.map((h) => [
        h.ride.id,
        h.badge.kind,
        h.metric,
      ]),
    ).toEqual([
      ["long", "longest", "distance"],
      ["hilly", "most-climbing", "elevation"],
    ]);
  });

  it("highlights a ride that is both once, and a lone ride never", async () => {
    await seed(
      ride("both", { startedAt: "2026-07-04T13:00:00Z", distanceM: 100_000 }),
      ride("other", {
        startedAt: "2026-07-05T13:00:00Z",
        distanceM: 20_000,
        elevationM: 100,
      }),
      ride("alone", { startedAt: "2026-06-05T13:00:00Z" }),
    );

    const { months, highlightMonths } = await queryCyclingActivity(db, NOW);

    expect(highlightMonths.map((month) => month.key)).toEqual(["2026-07"]);
    expect(highlightMonths[0]!.highlights).toHaveLength(1);
    expect(highlightMonths[0]!.highlights[0]!.badge.kind).toBe("longest");
    const both = months[0]!.rides.find((r) => r.id === "both")!;
    expect(both.badges.map((b) => b.kind)).toEqual([
      "longest",
      "most-climbing",
    ]);
    expect(months[1]!.rides[0]!.badges).toEqual([]);
  });

  it("ranks rides for every year and for all time", async () => {
    await seed(
      ride("a", { startedAt: "2025-05-01T13:00:00Z", distanceM: 90_000 }),
      ride("b", { startedAt: "2026-05-01T13:00:00Z", distanceM: 80_000 }),
      ride("c", {
        startedAt: "2026-06-01T13:00:00Z",
        distanceM: 70_000,
        movingS: 20_000,
        averageWatts: 180,
      }),
    );

    const { records } = await queryCyclingActivity(db, NOW);

    expect(records.map((period) => period.period)).toEqual([
      "all",
      "2026",
      "2025",
    ]);
    const all = records[0]!.lists.find((list) => list.id === "distance")!;
    expect(all.rows.map((row) => [row.id, row.detail, row.value])).toEqual([
      ["a", "'25", 55.92],
      ["b", "'26", 49.71],
      ["c", "'26", 43.5],
    ]);
    expect(all.rows[0]!.href).toBe("https://www.strava.com/activities/a");

    const days = records[1]!.lists.find((list) => list.id === "duration")!;
    expect(days.rows[0]).toMatchObject({ id: "c", detail: "'26 · 180 W" });

    const year2025 = records[2]!.lists.find((list) => list.id === "distance")!;
    expect(year2025.rows.map((row) => row.id)).toEqual(["a"]);
  });

  it("joins the power curve from measured rides only", async () => {
    await seed(
      ride("meter", { averageWatts: 210 }),
      ride("guess", { averageWatts: 400, powerSource: "estimated" }),
    );
    await publishPowerCurve(store, "meter", [
      { durationS: 5, watts: 900 },
      { durationS: 60, watts: 450.4 },
      { durationS: 1200, watts: 280 },
    ]);
    await publishPowerCurve(store, "guess", [{ durationS: 60, watts: 999 }]);

    const { records, months } = await queryCyclingActivity(db, NOW);

    expect(records[0]!.powerBests).toEqual([
      { id: "1m", label: "1 min", watts: 450 },
      { id: "5m", label: "5 min", watts: null },
      { id: "20m", label: "20 min", watts: 280 },
      { id: "1h", label: "1 hr", watts: null },
      { id: "ride", label: "ride avg", watts: 210 },
    ]);
    const guess = months[0]!.rides.find((r) => r.id === "guess")!;
    expect(guess).not.toHaveProperty("averageWatts");
  });

  it("gives each period the power its own rides set", async () => {
    await seed(
      ride("older", {
        startedAt: "2025-07-11T13:00:55Z",
        averageWatts: 240,
      }),
      ride("newer", { averageWatts: 190 }),
    );
    await publishPowerCurve(store, "older", [
      { durationS: 60, watts: 500 },
      { durationS: 1200, watts: 300 },
    ]);
    await publishPowerCurve(store, "newer", [{ durationS: 60, watts: 420 }]);

    const { records } = await queryCyclingActivity(db, NOW);
    const watts = (period: string) =>
      Object.fromEntries(
        records
          .find((entry) => entry.period === period)!
          .powerBests.map((best) => [best.id, best.watts]),
      );

    // The all-time ladder takes each duration from whichever year holds it.
    expect(watts("all")).toMatchObject({ "1m": 500, "20m": 300, ride: 240 });
    expect(watts("2026")).toMatchObject({ "1m": 420, "20m": null, ride: 190 });
    expect(watts("2025")).toMatchObject({ "1m": 500, "20m": 300, ride: 240 });
  });

  it("leaves the power panel empty with nothing measured", async () => {
    await seed(ride("guess", { averageWatts: 400, powerSource: "estimated" }));

    const { records } = await queryCyclingActivity(db, NOW);

    expect(records.every((period) => period.powerBests.length === 0)).toBe(
      true,
    );
  });

  it("ignores other sports", async () => {
    await seed(ride("run", { sport: "run" }), ride("ride"));

    const { months } = await queryCyclingActivity(db, NOW);

    expect(months[0]!.rides.map((r) => r.id)).toEqual(["ride"]);
    expect(months[0]!.rideCount).toBe(1);
  });
});

describe("queryCyclingLogPage", () => {
  it("carries exactly its own six months, tracks and all", async () => {
    await seed(
      ride("after", { startedAt: "2026-04-02T13:00:00Z" }),
      ride("newest", {
        startedAt: "2026-03-02T13:00:00Z",
        polyline: GOOGLE_EXAMPLE,
      }),
      ride("oldest", { startedAt: "2025-10-02T13:00:00Z" }),
      ride("before", { startedAt: "2025-09-02T13:00:00Z" }),
    );

    const page = await queryCyclingLogPage(db, "2026-04");

    expect(page.months.map((month) => month.key)).toEqual([
      "2026-03",
      "2025-10",
    ]);
    expect(page.months[0]!.rides[0]!.route).toBe(GOOGLE_EXAMPLE);
  });

  it("skips a gap to the next month with rides", async () => {
    await seed(
      ride("recent", { startedAt: "2026-03-02T13:00:00Z" }),
      ride("ancient", { startedAt: "2019-08-02T13:00:00Z" }),
    );

    const page = await queryCyclingLogPage(db, "2026-04");

    expect(page.logCursor).toBe("2019-09");
  });

  it("names the next page from a ride the window's own slack reached", async () => {
    await seed(
      ride("recent", { startedAt: "2026-03-02T13:00:00Z" }),
      // Just inside the window's lower bound by the instant, and in september
      // by its own clock, so it belongs to the page after this one.
      ride("straddle", {
        startedAt: "2025-10-01T04:00:00Z",
        timezone: "America/Los_Angeles",
      }),
    );

    const page = await queryCyclingLogPage(db, "2026-04");

    expect(page.months.map((month) => month.key)).toEqual(["2026-03"]);
    expect(page.logCursor).toBe("2025-10");
  });

  it("runs out at the first ride", async () => {
    await seed(ride("only", { startedAt: "2026-03-02T13:00:00Z" }));

    const page = await queryCyclingLogPage(db, "2026-04");

    expect(page.logCursor).toBeNull();
  });

  it("files a ride straddling a page boundary on one page only", async () => {
    // 2026-04-01 in UTC, still march in the rider's zone, so the page that
    // ends before april claims it and the page that starts at april does not.
    const straddle = {
      startedAt: "2026-04-01T04:00:00Z",
      timezone: "America/Los_Angeles",
    };
    await seed(ride("straddle", straddle), ride("anchor"));

    const earlier = await queryCyclingLogPage(db, "2026-04");
    const later = await queryCyclingLogPage(db, "2026-10");

    expect(rideIds(earlier)).toContain("straddle");
    expect(rideIds(later)).not.toContain("straddle");
  });

  it("returns an empty page for a window with no rides", async () => {
    await seed(ride("old", { startedAt: "2019-08-02T13:00:00Z" }));

    const page = await queryCyclingLogPage(db, "2026-04");

    expect(page.months).toEqual([]);
    expect(page.logCursor).toBe("2019-09");
  });

  it("ignores other sports", async () => {
    await seed(
      ride("run", { sport: "run", startedAt: "2026-03-02T13:00:00Z" }),
      ride("older-run", { sport: "run", startedAt: "2019-08-02T13:00:00Z" }),
    );

    const page = await queryCyclingLogPage(db, "2026-04");

    expect(page.months).toEqual([]);
    expect(page.logCursor).toBeNull();
  });
});

describe("the log's first cursor", () => {
  it("is null when every ride is already in the window", async () => {
    await seed(
      ride("new", { startedAt: "2026-07-11T13:00:55Z" }),
      ride("old", { startedAt: "2025-09-11T13:00:55Z" }),
    );

    const data = await queryCyclingActivity(db, NOW);

    expect(data.logCursor).toBeNull();
  });

  it("skips the off-season to the newest month below the window", async () => {
    await seed(
      ride("new", { startedAt: "2026-07-11T13:00:55Z" }),
      ride("old", { startedAt: "2023-05-11T13:00:55Z" }),
    );

    const data = await queryCyclingActivity(db, NOW);

    expect(data.months.at(-1)!.key).toBe("2026-07");
    expect(data.logCursor).toBe("2023-06");
  });
});

describe("readFeedVersion", () => {
  it("moves on every write and on delete", async () => {
    const empty = await readFeedVersion(db);
    await seed(ride("a"));
    const one = await readFeedVersion(db);
    await new Promise((resolve) => setTimeout(resolve, 2));
    await publishPowerCurve(store, "a", [{ durationS: 60, watts: 300 }]);
    const curved = await readFeedVersion(db);
    await deleteActivity(store, "a");
    const deleted = await readFeedVersion(db);

    expect(new Set([empty, one, curved]).size).toBe(3);
    expect(deleted).toBe(empty);
    expect(empty).toBe("0.0");
    expect(one).toMatch(/^1\.\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
  });
});

// The stories render the fixtures and the page renders the feed. Both compile
// against one type, and this keeps that true as a runtime check too: the feed
// cannot produce a key the fixtures lack, or the reverse.
describe("contract", () => {
  it("matches the story fixtures field for field", async () => {
    await seed(
      ride("a", { polyline: GOOGLE_EXAMPLE, elevationProfile: [1, 2, 3] }),
      ride("b", { startedAt: "2026-07-12T13:00:55Z", distanceM: 50_000 }),
      ride("c", { startedAt: "2025-07-12T13:00:55Z" }),
    );
    await publishPowerCurve(store, "a", [{ durationS: 60, watts: 300 }]);

    const feed = await queryCyclingActivity(db, NOW);
    expectTypeOf(feed).toEqualTypeOf<CyclingActivityData>();
    expectTypeOf(fixture).toEqualTypeOf<CyclingActivityData>();

    expect(keys(feed)).toEqual(keys(fixture));
    expect(keys(feed.totals)).toEqual(keys(fixture.totals));
    expect(keys(feed.months[0])).toEqual(keys(fixture.months[0]));
    expect(keys(feed.highlightMonths[0])).toEqual(
      keys(fixture.highlightMonths[0]),
    );
    expect(keys(feed.records[0])).toEqual(keys(fixture.records[0]));
    expect(keys(feed.records[0]!.lists[0])).toEqual(
      keys(fixture.records[0]!.lists[0]),
    );
    expect(keys(feed.records[0]!.powerBests[0])).toEqual(
      keys(fixture.records[0]!.powerBests[0]),
    );
    expect(
      buildCyclingActivity({ rides: [], tracks: [] }, [], NOW).months,
    ).toEqual([]);
  });
});

function rideIds(page: { months: { rides: { id: string }[] }[] }): string[] {
  return page.months.flatMap((month) => month.rides.map((entry) => entry.id));
}

function keys(value: object | undefined): string[] {
  return Object.keys(value ?? {}).toSorted();
}
