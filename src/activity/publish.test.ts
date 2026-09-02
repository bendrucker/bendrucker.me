import { describe, it, expect, beforeEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, testStore } from "@/test/db";
import {
  deleteActivity,
  publishActivity,
  publishPowerCurve,
  ValidationError,
  type PublishedActivity,
} from "./publish";
import type { ActivityStore } from "./store";

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

function feedRow() {
  return db.selectFrom("activityFeed").selectAll().executeTakeFirstOrThrow();
}

describe("publishActivity", () => {
  it("writes SI units and JSON-encodes the array columns", async () => {
    await publishActivity(store, activity());

    const row = await feedRow();
    expect(row.distanceM).toBe(42500);
    expect(row.powerSource).toBe("measured");
    expect(JSON.parse(row.elevationProfile!)).toEqual([10, 20, 30]);
    expect(JSON.parse(row.photoKeys)).toEqual([
      "raw/strava/activities/9911/photos/abc.jpg",
    ]);
  });

  it("replaces an activity that was already published", async () => {
    await publishActivity(store, activity());
    await publishActivity(
      store,
      activity({ name: "Renamed", distanceM: 50000, elevationProfile: null }),
    );

    const rows = await db.selectFrom("activityFeed").selectAll().execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("Renamed");
    expect(rows[0]!.distanceM).toBe(50000);
    expect(rows[0]!.elevationProfile).toBeNull();
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
    );

    const row = await feedRow();
    expect(row.polyline).toBeNull();
    expect(JSON.parse(row.photoKeys)).toEqual([]);
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
    await expect(publishActivity(store, row)).rejects.toThrow(ValidationError);
  });
});

describe("publishPowerCurve", () => {
  it("replaces the whole ladder", async () => {
    await publishActivity(store, activity());
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
    await publishActivity(store, activity());
    const before = (await feedRow()).updatedAt;
    await new Promise((resolve) => setTimeout(resolve, 2));
    await publishPowerCurve(store, "a1", [{ durationS: 60, watts: 400 }]);

    expect((await feedRow()).updatedAt > before).toBe(true);
  });

  it("clears the ladder when an activity stops having one", async () => {
    await publishActivity(store, activity());
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
  it("removes the activity and its power curve", async () => {
    await publishActivity(store, activity());
    await publishPowerCurve(store, "a1", [{ durationS: 5, watts: 900 }]);

    await deleteActivity(store, "a1");

    expect(await db.selectFrom("activityFeed").selectAll().execute()).toEqual(
      [],
    );
    expect(
      await db.selectFrom("activityPowerCurve").selectAll().execute(),
    ).toEqual([]);
  });

  it("is a no-op for an activity that was never published", async () => {
    await expect(deleteActivity(store, "gone")).resolves.toBeUndefined();
  });

  it("rejects an empty id", async () => {
    await expect(deleteActivity(store, "")).rejects.toThrow(ValidationError);
  });
});
