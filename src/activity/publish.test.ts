import { describe, it, expect, beforeEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, noClimbNames, testStore, tick } from "@/test/db";
import {
  deleteActivity,
  publishActivity,
  publishPowerCurve,
  ValidationError,
  type PublishedActivity,
} from "./publish";
import type { ActivityStore } from "./store";
import { decodePolyline, encodePolyline } from "./track";
import type { Coordinate } from "./types";

let db: Kysely<Database>;
let store: ActivityStore;

beforeEach(() => {
  db = createTestDb();
  store = testStore(db);
});

function activity(
  overrides: Partial<PublishedActivity> = {},
): PublishedActivity {
  return {
    activityId: "a1",
    stravaId: "9911",
    name: "Morning Ride",
    sport: "ride",
    startedAt: "2026-01-01T14:00:00.000Z",
    timezone: "America/Los_Angeles",
    distanceM: 42500,
    movingS: 3400,
    elevationM: 320,
    averageWatts: 210,
    powerSource: "measured",
    polyline: "_p~iF~ps|U",
    elevationProfile: [10, 20, 30],
    photoKeys: ["raw/strava/activities/9911/photos/abc.jpg"],
    ...overrides,
  };
}

// Eleven points due north, so profile sample `i` of eleven sits on point `i`.
const climbRoute: Coordinate[] = Array.from({ length: 11 }, (_, i) => [
  37 + i * 0.01,
  -122,
]);

function hillyRide(profile: number[]): PublishedActivity {
  return activity({
    polyline: encodePolyline(climbRoute),
    elevationProfile: profile,
  });
}

const twoClimbs = [0, 200, 400, 300, 100, 0, 300, 600, 500, 400, 300];

async function climbRows() {
  return db
    .selectFrom("activityClimb")
    .selectAll()
    .orderBy("position")
    .execute();
}

async function feedRow() {
  return db.selectFrom("activityFeed").selectAll().executeTakeFirstOrThrow();
}

describe("publishActivity", () => {
  it("writes SI units and JSON-encodes the array columns", async () => {
    await publishActivity(store, activity(), noClimbNames);

    const row = await feedRow();
    expect(row.distanceM).toBe(42500);
    expect(row.powerSource).toBe("measured");
    expect(JSON.parse(row.elevationProfile!)).toEqual([10, 20, 30]);
    expect(JSON.parse(row.photoKeys)).toEqual([
      "raw/strava/activities/9911/photos/abc.jpg",
    ]);
  });

  it("replaces an activity that was already published", async () => {
    await publishActivity(store, activity(), noClimbNames);
    await publishActivity(
      store,
      activity({ name: "Renamed", distanceM: 50000, elevationProfile: null }),
      noClimbNames,
    );

    const rows = await db.selectFrom("activityFeed").selectAll().execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("Renamed");
    expect(rows[0]!.distanceM).toBe(50000);
    expect(rows[0]!.elevationProfile).toBeNull();
  });

  it("stores a track thinned to what a card draws", async () => {
    // Each repeat re-encodes the same deltas, so the string stays decodable.
    const polyline = "_p~iF~ps|U_ulLnnqC_mqNvxq`@".repeat(400);
    await publishActivity(
      store,
      activity({
        polyline,
        elevationProfile: Array.from({ length: 1000 }, (_, i) => i),
      }),
      noClimbNames,
    );

    const row = await db
      .selectFrom("activityFeed")
      .select(["polyline", "elevationProfile"])
      .executeTakeFirstOrThrow();
    const route = decodePolyline(row.polyline!);
    expect(route.length).toBeLessThanOrEqual(301);
    expect(route.at(-1)).toEqual(decodePolyline(polyline).at(-1));
    const profile: unknown = JSON.parse(row.elevationProfile!);
    expect(profile).toHaveLength(101);
    expect(profile).toEqual(expect.arrayContaining([0, 999]));
  });

  it("accepts an activity with nothing but the registry fields", async () => {
    await publishActivity(
      store,
      activity({
        stravaId: null,
        name: null,
        distanceM: null,
        movingS: null,
        elevationM: null,
        averageWatts: null,
        powerSource: "none",
        polyline: null,
        elevationProfile: null,
        photoKeys: [],
      }),
      noClimbNames,
    );

    const row = await feedRow();
    expect(row.polyline).toBeNull();
    expect(JSON.parse(row.photoKeys)).toEqual([]);
  });

  it("stores each climb in ride order with the name found for it", async () => {
    const asked: Coordinate[][] = [];
    await publishActivity(store, hillyRide(twoClimbs), async (summits) => {
      asked.push(summits);
      return ["Mount Diablo", null];
    });

    expect(asked).toEqual([[climbRoute[2], climbRoute[7]]]);
    expect(await climbRows()).toEqual([
      {
        activityId: "a1",
        position: 0,
        gainM: 400,
        summitLat: 37.02,
        summitLng: -122,
        name: "Mount Diablo",
      },
      {
        activityId: "a1",
        position: 1,
        gainM: 600,
        summitLat: 37.07,
        summitLng: -122,
        name: null,
      },
    ]);
  });

  it("replaces the climbs a re-publish no longer finds", async () => {
    await publishActivity(store, hillyRide(twoClimbs), noClimbNames);
    await publishActivity(
      store,
      hillyRide([0, 0, 0, 0, 0, 0, 300, 600, 500, 400, 300]),
      noClimbNames,
    );

    const rows = await climbRows();
    expect(rows.map((row) => [row.position, row.gainM])).toEqual([[0, 600]]);
  });

  it("reuses stored names rather than looking the same summits up again", async () => {
    await publishActivity(store, hillyRide(twoClimbs), async () => [
      "Mount Diablo",
      "Mount Hamilton",
    ]);
    await publishActivity(
      store,
      { ...hillyRide(twoClimbs), name: "Renamed" },
      async () => {
        throw new Error("should not look anything up");
      },
    );

    expect((await climbRows()).map((row) => row.name)).toEqual([
      "Mount Diablo",
      "Mount Hamilton",
    ]);
  });

  it("asks again for a summit stored without a name", async () => {
    await publishActivity(store, hillyRide(twoClimbs), async () => [
      "Mount Diablo",
      null,
    ]);
    const asked: Coordinate[][] = [];
    await publishActivity(store, hillyRide(twoClimbs), async (summits) => {
      asked.push(summits);
      return ["Mount Hamilton"];
    });

    expect(asked).toEqual([[climbRoute[7]]]);
    expect((await climbRows()).map((row) => row.name)).toEqual([
      "Mount Diablo",
      "Mount Hamilton",
    ]);
  });

  it("stores no climbs for a ride without a route", async () => {
    await publishActivity(
      store,
      { ...hillyRide(twoClimbs), polyline: null },
      async () => {
        throw new Error("should not look anything up");
      },
    );

    expect(await climbRows()).toEqual([]);
  });

  // A wrong shape has to surface as ValidationError specifically: the hub
  // parks on that name and retries on anything else, so a generic Error here
  // would put a permanently broken activity into a retry loop.
  it.each([
    ["a non-object", "not a row"],
    ["a missing id", { ...activity(), activityId: "" }],
    ["an unknown power source", { ...activity(), powerSource: "guessed" }],
    ["a non-finite number", { ...activity(), distanceM: Number.NaN }],
    ["an unparseable timestamp", { ...activity(), startedAt: "whenever" }],
    ["a non-array elevation profile", { ...activity(), elevationProfile: 12 }],
    ["a non-string photo key", { ...activity(), photoKeys: [7] }],
  ])("rejects %s", async (_label, row) => {
    await expect(publishActivity(store, row, noClimbNames)).rejects.toThrow(
      ValidationError,
    );
  });
});

describe("publishPowerCurve", () => {
  it("replaces the whole ladder", async () => {
    await publishActivity(store, activity(), noClimbNames);
    await publishPowerCurve(store, "a1", [
      { durationS: 5, watts: 900 },
      { durationS: 300, watts: 320 },
    ]);
    await publishPowerCurve(store, "a1", [{ durationS: 5, watts: 950 }]);

    const rows = await db
      .selectFrom("activityPowerCurve")
      .selectAll()
      .execute();
    expect(rows).toEqual([{ activityId: "a1", durationS: 5, watts: 950 }]);
  });

  it("moves the activity's updatedAt so the feed version changes", async () => {
    await publishActivity(store, activity(), noClimbNames);
    const before = (await feedRow()).updatedAt;
    await tick();
    await publishPowerCurve(store, "a1", [{ durationS: 60, watts: 400 }]);

    expect((await feedRow()).updatedAt > before).toBe(true);
  });

  it("clears the ladder when an activity stops having one", async () => {
    await publishActivity(store, activity(), noClimbNames);
    await publishPowerCurve(store, "a1", [{ durationS: 5, watts: 900 }]);
    await publishPowerCurve(store, "a1", []);

    expect(
      await db.selectFrom("activityPowerCurve").selectAll().execute(),
    ).toEqual([]);
  });

  it.each([
    ["a fractional duration", [{ durationS: 5.5, watts: 900 }]],
    ["a duration of zero", [{ durationS: 0, watts: 900 }]],
    [
      "a repeated duration",
      [
        { durationS: 5, watts: 900 },
        { durationS: 5, watts: 800 },
      ],
    ],
    ["a non-numeric wattage", [{ durationS: 5, watts: "900" }]],
    ["something that is not a list", { durationS: 5, watts: 900 }],
  ])("rejects %s", async (_label, bests) => {
    await expect(publishPowerCurve(store, "a1", bests)).rejects.toThrow(
      ValidationError,
    );
  });
});

describe("deleteActivity", () => {
  it("removes the activity, its power curve, and its climbs", async () => {
    await publishActivity(store, hillyRide(twoClimbs), noClimbNames);
    await publishPowerCurve(store, "a1", [{ durationS: 5, watts: 900 }]);

    await deleteActivity(store, "a1");

    expect(await db.selectFrom("activityFeed").selectAll().execute()).toEqual(
      [],
    );
    expect(
      await db.selectFrom("activityPowerCurve").selectAll().execute(),
    ).toEqual([]);
    expect(await climbRows()).toEqual([]);
  });

  it("is a no-op for an activity that was never published", async () => {
    await expect(deleteActivity(store, "gone")).resolves.toBeUndefined();
  });

  it("rejects an empty id", async () => {
    await expect(deleteActivity(store, "")).rejects.toThrow(ValidationError);
  });
});
