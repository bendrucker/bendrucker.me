import { describe, it, expect, beforeEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, seed, testStore } from "@/test/db";
import { publishActivity, type PublishedActivity } from "@/activity/publish";
import type { ActivityStore } from "@/activity/store";
import { queryRecentActivity, RECENT_COUNT } from "./recent";

let db: Kysely<Database>;
let store: ActivityStore;

beforeEach(() => {
  db = createTestDb();
  store = testStore(db);
});

const NOW = new Date("2026-03-15T12:00:00Z");

function ride(id: string, day: number): PublishedActivity {
  return {
    activityId: id,
    stravaId: id,
    name: `Ride ${id}`,
    sport: "ride",
    startedAt: new Date(Date.UTC(2026, 2, day, 15)).toISOString(),
    timezone: "America/Los_Angeles",
    distanceM: 40000,
    movingS: 5400,
    elevationM: 600,
    averageWatts: null,
    powerSource: "none",
    polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
    elevationProfile: null,
    photoKeys: [],
  };
}

describe("queryRecentActivity", () => {
  it("takes the newest rides, each with its track, and the latest repos", async () => {
    for (const day of [3, 11, 7, 1, 9]) {
      await publishActivity(store, ride(`r${day}`, day));
    }
    await seed(db, [
      { owner: "bendrucker", name: "old", activity: [{ lastActivity: 100 }] },
      {
        owner: "bendrucker",
        name: "newest",
        activity: [{ lastActivity: 400 }],
      },
      { owner: "other", name: "mid", activity: [{ lastActivity: 300 }] },
      { owner: "bendrucker", name: "older", activity: [{ lastActivity: 200 }] },
    ]);

    const recent = await queryRecentActivity(db, NOW);

    expect(recent.rides.map((r) => r.id)).toEqual(["r11", "r9", "r7"]);
    expect(recent.rides).toHaveLength(RECENT_COUNT);
    expect(recent.rides.every((r) => r.route !== undefined)).toBe(true);
    expect(recent.repos.map((r) => r.name)).toEqual(["newest", "mid", "older"]);
  });

  it("passes over the everyday personal repos, but not a fork of one", async () => {
    await seed(db, [
      {
        owner: "bendrucker",
        name: "dotfiles",
        activity: [{ lastActivity: 500 }],
      },
      { owner: "other", name: "dotfiles", activity: [{ lastActivity: 400 }] },
      {
        owner: "bendrucker",
        name: "claude",
        activity: [{ lastActivity: 300 }],
      },
      { owner: "bendrucker", name: "kept", activity: [{ lastActivity: 200 }] },
    ]);

    const recent = await queryRecentActivity(db, NOW);

    expect(recent.repos.map((r) => `${r.owner}/${r.name}`)).toEqual([
      "other/dotfiles",
      "bendrucker/kept",
    ]);
  });

  it("renders empty rails from an empty database", async () => {
    const recent = await queryRecentActivity(db, NOW);
    expect(recent).toEqual({ rides: [], repos: [] });
  });
});
