import { describe, it, expect, beforeEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, seed, testStore } from "@/test/db";
import { publishActivity, type PublishedActivity } from "@/activity/publish";
import type { ActivityStore } from "@/activity/store";
import {
  queryCodeRecords,
  queryRideRecords,
  recordItems,
  type CodeRecords,
  type RideRecords,
} from "./records";

let db: Kysely<Database>;
let store: ActivityStore;

beforeEach(() => {
  db = createTestDb();
  store = testStore(db);
});

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
    distanceM: 40000,
    movingS: 5400,
    elevationM: 600,
    averageWatts: null,
    powerSource: "none",
    polyline: null,
    elevationProfile: null,
    photoKeys: [],
    ...overrides,
  };
}

describe("queryRideRecords", () => {
  it("crowns the longest, the most climbing, and the longest day", async () => {
    await publishActivity(
      store,
      ride("far", "2023-05-20T14:00:00Z", {
        distanceM: 435000,
        movingS: 64000,
      }),
    );
    await publishActivity(
      store,
      ride("high", "2024-07-04T14:00:00Z", { elevationM: 6750 }),
    );
    await publishActivity(
      store,
      ride("junk", "2017-01-01T14:00:00Z", {
        distanceM: 100,
        elevationM: 30480,
      }),
    );
    await publishActivity(store, ride("first", "2013-03-20T16:42:06Z"));

    const records = await queryRideRecords(db);

    expect(records.longest).toEqual({
      name: "Ride far",
      year: 2023,
      stravaUrl: "https://www.strava.com/activities/far",
      distanceMi: expect.closeTo(270.3, 1),
    });
    expect(records.mostClimbing?.name).toBe("Ride high");
    expect(records.mostClimbing?.elevationFt).toBeCloseTo(22146, 0);
    expect(records.longestDay?.name).toBe("Ride far");
    expect(records.longestDay?.movingHours).toBeCloseTo(17.8, 1);
    expect(records.firstYear).toBe(2013);
    expect(records.rideCount).toBe(4);
  });

  it("dates a record by the ride's own clock", async () => {
    // New Year's Eve in San Francisco, already 2025 in UTC.
    await publishActivity(store, ride("nye", "2025-01-01T06:00:00Z"));

    const records = await queryRideRecords(db);

    expect(records.longest?.year).toBe(2024);
    expect(records.firstYear).toBe(2024);
  });

  it("is empty with no rides", async () => {
    expect(await queryRideRecords(db)).toEqual({
      longest: null,
      mostClimbing: null,
      longestDay: null,
      firstYear: null,
      rideCount: 0,
      movingHours: 0,
    });
  });
});

describe("queryCodeRecords", () => {
  it("finds the first own repository and the most-starred others", async () => {
    const when = Math.floor(Date.UTC(2026, 5, 1) / 1000);
    await seed(db, [
      {
        owner: "bendrucker",
        name: "late",
        createdAt: "2020-01-01T00:00:00Z",
        activity: [{ lastActivity: when }],
      },
      {
        owner: "bendrucker",
        name: "early",
        createdAt: "2012-12-27T22:21:59Z",
        stargazerCount: 900,
        activity: [{ lastActivity: when }],
      },
      {
        owner: "Homebrew",
        name: "brew",
        stargazerCount: 49477,
        activity: [{ lastActivity: when }],
      },
      {
        owner: "hashicorp",
        name: "terraform-provider-aws",
        stargazerCount: 11077,
        activity: [{ lastActivity: when }],
      },
      {
        owner: "terraform-linters",
        name: "tflint",
        stargazerCount: 5802,
        activity: [{ lastActivity: when }],
      },
      {
        owner: "someone",
        name: "tiny",
        stargazerCount: 3,
        activity: [{ lastActivity: when }],
      },
    ]);

    const records = await queryCodeRecords(db);

    expect(records.firstYear).toBe(2012);
    expect(records.starred.map((repo) => repo.name)).toEqual([
      "brew",
      "terraform-provider-aws",
      "tflint",
    ]);
  });

  it("is empty with nothing synced", async () => {
    expect(await queryCodeRecords(db)).toEqual({
      firstYear: null,
      starred: [],
    });
  });
});

describe("recordItems", () => {
  const rides: RideRecords = {
    longest: {
      name: "Skaggs",
      year: 2023,
      distanceMi: 270.6,
      stravaUrl: "https://www.strava.com/activities/1",
    },
    mostClimbing: { name: "Tam", year: 2024, elevationFt: 22156 },
    longestDay: { name: "Skaggs", year: 2023, movingHours: 17.8 },
    firstYear: 2013,
    rideCount: 4225,
    movingHours: 7269,
  };
  const code: CodeRecords = {
    firstYear: 2012,
    starred: [
      {
        owner: "Homebrew",
        name: "brew",
        url: "https://github.com/Homebrew/brew",
      },
    ],
  };

  it("alternates cycling and code, linking what has a page", () => {
    const items = recordItems(rides, code);

    expect(items.map((item) => item.text)).toEqual([
      "Longest ride: Skaggs, 271 mi in 2023",
      "On GitHub since 2012",
      "4,225 rides since 2013",
      "Contributor to Homebrew/brew",
      "Most climbing: Tam, 22,156 ft in 2024",
      "7,269 hours in the saddle",
      "Longest day: Skaggs, 17.8 hours moving",
    ]);
    expect(items[0]?.href).toBe("https://www.strava.com/activities/1");
    expect(items[3]?.href).toBe("https://github.com/Homebrew/brew");
    expect(items[4]?.href).toBeUndefined();
  });

  it("says nothing about data it does not have", () => {
    const empty: RideRecords = {
      longest: null,
      mostClimbing: null,
      longestDay: null,
      firstYear: null,
      rideCount: 0,
      movingHours: 0,
    };
    expect(recordItems(empty, { firstYear: null, starred: [] })).toEqual([]);
  });
});
