import { describe, it, expect, beforeEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, seed, testStore } from "@/test/db";
import { publishActivity, type PublishedActivity } from "@/activity/publish";
import type { ActivityStore } from "@/activity/store";
import { periodStart, queryCodeTotals, queryCyclingTotals } from "./stats";

let db: Kysely<Database>;
let store: ActivityStore;

beforeEach(() => {
  db = createTestDb();
  store = testStore(db);
});

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
  it("rolls thirty days and a year back from now", () => {
    expect(periodStart("month", NOW)?.toISOString()).toBe(
      "2026-08-10T03:00:00.000Z",
    );
    expect(periodStart("year", NOW)?.toISOString()).toBe(
      "2025-09-09T03:00:00.000Z",
    );
    expect(periodStart("all", NOW)).toBeNull();
  });
});

describe("queryCyclingTotals", () => {
  it("sums each window in miles and feet, commutes included", async () => {
    await publishActivity(store, ride("sep", "2026-09-05T15:00:00Z"));
    await publishActivity(
      store,
      ride("commute", "2026-09-06T15:00:00Z", { distanceM: 5000 }),
    );
    await publishActivity(store, ride("jul", "2026-07-20T15:00:00Z"));
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

  it("draws the window's edge at the hour, not the day", async () => {
    await publishActivity(store, ride("in", "2026-08-10T04:00:00Z"));
    await publishActivity(store, ride("out", "2026-08-10T02:00:00Z"));

    const totals = await queryCyclingTotals(db, NOW);

    expect(totals.month.rideCount).toBe(1);
    expect(totals.year.rideCount).toBe(2);
  });

  it("is zeros on an empty feed", async () => {
    const totals = await queryCyclingTotals(db, NOW);
    expect(totals.all).toEqual({ distanceMi: 0, elevationFt: 0, rideCount: 0 });
  });
});

const at = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe("queryCodeTotals", () => {
  it("counts rows by when their year was last active", async () => {
    await seed(db, [
      {
        owner: "bendrucker",
        name: "a",
        activity: [
          {
            lastActivity: at("2026-06-01T00:00:00Z"),
            prCount: 3,
            reviewCount: 1,
          },
          { lastActivity: at("2025-06-01T00:00:00Z"), prCount: 9 },
        ],
      },
      {
        owner: "other",
        name: "b",
        activity: [
          {
            lastActivity: at("2026-09-01T00:00:00Z"),
            prCount: 2,
            reviewCount: 4,
          },
        ],
      },
    ]);

    const totals = await queryCodeTotals(db, NOW);

    expect(totals.month).toEqual({
      prCount: null,
      reviewCount: null,
      repoCount: 1,
    });
    expect(totals.year).toEqual({ prCount: 5, reviewCount: 5, repoCount: 2 });
    expect(totals.all).toEqual({ prCount: 14, reviewCount: 5, repoCount: 2 });
  });

  it("is zeros with nothing synced", async () => {
    const totals = await queryCodeTotals(db, NOW);
    expect(totals.year).toEqual({ prCount: 0, reviewCount: 0, repoCount: 0 });
    expect(totals.month.repoCount).toBe(0);
  });
});
