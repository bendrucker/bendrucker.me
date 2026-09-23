import { describe, it, expect, beforeEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, seed, testStore } from "@/test/db";
import { publishActivity, type PublishedActivity } from "@/activity/publish";
import type { ActivityStore } from "@/activity/store";
import { queryRecentRepos, queryRecentRides } from "./recent";

let db: Kysely<Database>;
let store: ActivityStore;

beforeEach(() => {
  db = createTestDb();
  store = testStore(db);
});

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

describe("queryRecentRides", () => {
  it("takes the latest three newest first", async () => {
    for (const day of [3, 11, 7, 1, 9]) {
      await publishActivity(store, ride(`r${day}`, day));
    }

    const rides = await queryRecentRides(db);

    expect(rides.map((r) => r.id)).toEqual(["r11", "r9", "r7"]);
  });

  it("orders by wall clock past the limit when the zones disagree", async () => {
    // Three rides in Los Angeles, then one in Tokyo that started earlier by
    // the instant and later by its own clock than the third of them.
    for (const day of [5, 4, 3]) {
      await publishActivity(store, {
        ...ride(`la${day}`, day),
        startedAt: `2026-03-0${day}T17:00:00.000Z`,
      });
    }
    await publishActivity(store, {
      ...ride("tokyo", 3),
      startedAt: "2026-03-03T15:30:00.000Z",
      timezone: "Asia/Tokyo",
    });

    const rides = await queryRecentRides(db);

    expect(rides.map((r) => r.id)).toEqual(["la5", "la4", "tokyo"]);
  });

  it("leaves commutes out, as the feed's months do", async () => {
    await publishActivity(store, ride("long", 10));
    await publishActivity(store, { ...ride("commute", 11), distanceM: 5000 });

    const rides = await queryRecentRides(db);

    expect(rides.map((r) => r.id)).toEqual(["long"]);
  });

  it("renders an empty list from an empty database", async () => {
    expect(await queryRecentRides(db)).toEqual([]);
  });
});

describe("queryRecentRepos", () => {
  it("takes the latest three, whoever owns them", async () => {
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

    const repos = await queryRecentRepos(db);

    expect(repos.map((r) => r.name)).toEqual(["newest", "mid", "older"]);
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

    const repos = await queryRecentRepos(db);

    expect(repos.map((r) => `${r.owner}/${r.name}`)).toEqual([
      "other/dotfiles",
      "bendrucker/kept",
    ]);
  });

  it("renders an empty list from an empty database", async () => {
    expect(await queryRecentRepos(db)).toEqual([]);
  });
});
