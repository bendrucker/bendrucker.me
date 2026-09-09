import { describe, it, expect, beforeEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, seed, testStore } from "@/test/db";
import { publishActivity, type PublishedActivity } from "@/activity/publish";
import type { ActivityStore } from "@/activity/store";
import {
  periodLabel,
  periodStart,
  queryCodeTotals,
  queryCyclingTotals,
} from "./stats";

let db: Kysely<Database>;
let store: ActivityStore;

beforeEach(() => {
  db = createTestDb();
  store = testStore(db);
});

// A San Francisco evening on the 8th: UTC has moved on to the 9th.
const NOW = new Date("2026-09-09T03:00:00Z");

function ride(
  id: string,
  startedAt: string,
  overrides: Partial<PublishedActivity> = {},
): PublishedActivity {
  return {
    activityId: id,
    stravaId: id,
    name: `Ride ${id}`,
    sport: "ride",
    startedAt,
    timezone: "America/Los_Angeles",
    distanceM: 16093.44,
    movingS: 3600,
    elevationM: 304.8,
    averageWatts: null,
    powerSource: "none",
    polyline: null,
    elevationProfile: null,
    photoKeys: [],
    ...overrides,
  };
}

describe("periodStart", () => {
  it("opens the month and year at the site's midnight", () => {
    expect(periodStart("month", NOW)?.toISOString()).toBe(
      "2026-09-01T07:00:00.000Z",
    );
    expect(periodStart("year", NOW)?.toISOString()).toBe(
      "2026-01-01T08:00:00.000Z",
    );
    expect(periodStart("all", NOW)).toBeNull();
  });
});

describe("periodLabel", () => {
  it("names the month and year on the site's clock", () => {
    expect(periodLabel("month", NOW)).toBe("september");
    expect(periodLabel("year", NOW)).toBe("2026");
    expect(periodLabel("all", NOW)).toBe("all time");
  });

  it("reads the month from the site's calendar, not UTC's", () => {
    expect(periodLabel("month", new Date("2026-10-01T03:00:00Z"))).toBe(
      "september",
    );
  });
});

describe("queryCyclingTotals", () => {
  it("sums each window in miles and feet, commutes included", async () => {
    await publishActivity(store, ride("sep", "2026-09-05T15:00:00Z"));
    await publishActivity(
      store,
      ride("commute", "2026-09-06T15:00:00Z", { distanceM: 5000 }),
    );
    await publishActivity(store, ride("aug", "2026-08-20T15:00:00Z"));
    await publishActivity(store, ride("old", "2019-06-01T15:00:00Z"));
    await publishActivity(
      store,
      ride("hike", "2026-09-07T15:00:00Z", { sport: "hike" }),
    );

    const totals = await queryCyclingTotals(db, NOW);

    expect(totals.month.rideCount).toBe(2);
    expect(totals.month.distanceMi).toBeCloseTo(10 + 5000 / 1609.344, 3);
    expect(totals.month.elevationFt).toBeCloseTo(2000, 0);
    expect(totals.year.rideCount).toBe(3);
    expect(totals.all.rideCount).toBe(4);
    expect(totals.all.distanceMi).toBeCloseTo(30 + 5000 / 1609.344, 3);
  });

  it("files a late evening ride under the site's month", async () => {
    // 11pm on August 31st in San Francisco is September 1st in UTC.
    await publishActivity(store, ride("late", "2026-09-01T06:00:00Z"));

    const totals = await queryCyclingTotals(db, NOW);

    expect(totals.month.rideCount).toBe(0);
    expect(totals.year.rideCount).toBe(1);
  });

  it("is zeros on an empty feed", async () => {
    const totals = await queryCyclingTotals(db, NOW);
    expect(totals.all).toEqual({ distanceMi: 0, elevationFt: 0, rideCount: 0 });
  });
});

describe("queryCodeTotals", () => {
  it("sums this year's per-repository rows", async () => {
    const thisYear = Math.floor(Date.UTC(2026, 5, 1) / 1000);
    const lastYear = Math.floor(Date.UTC(2025, 5, 1) / 1000);
    await seed(db, [
      {
        owner: "bendrucker",
        name: "a",
        activity: [
          { lastActivity: thisYear, prCount: 3, reviewCount: 1 },
          { lastActivity: lastYear, prCount: 9 },
        ],
      },
      {
        owner: "other",
        name: "b",
        activity: [{ lastActivity: thisYear, prCount: 2, reviewCount: 4 }],
      },
    ]);

    expect(await queryCodeTotals(db, NOW)).toEqual({
      prCount: 5,
      reviewCount: 5,
      repoCount: 2,
    });
  });

  it("is zeros with nothing synced", async () => {
    expect(await queryCodeTotals(db, NOW)).toEqual({
      prCount: 0,
      reviewCount: 0,
      repoCount: 0,
    });
  });
});
