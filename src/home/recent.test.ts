import { describe, it, test, expect, beforeEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, seed, testStore } from "@/test/db";
import { publishActivity, type PublishedActivity } from "@/activity/publish";
import type { ActivityStore } from "@/activity/store";
import { recencyLabel } from "@/components/recency";
import {
  queryRecentRepos,
  queryRecentRides,
  RECENT_MAX,
  RECENT_MIN,
  recentWindow,
  rideWhen,
  siteWallClock,
} from "./recent";

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

describe("queryRecentRides", () => {
  it("takes the month's rides newest first", async () => {
    for (const day of [3, 11, 7, 1, 9]) {
      await publishActivity(store, ride(`r${day}`, day));
    }

    const rides = await queryRecentRides(db, NOW);

    expect(rides.map((r) => r.id)).toEqual(["r11", "r9", "r7", "r3", "r1"]);
  });

  it("leaves commutes out, as the feed's months do", async () => {
    await publishActivity(store, ride("long", 10));
    await publishActivity(store, { ...ride("commute", 11), distanceM: 5000 });

    const rides = await queryRecentRides(db, NOW);

    expect(rides.map((r) => r.id)).toEqual(["long"]);
  });

  it("reads today by the ride's clock and the site's, not the worker's", async () => {
    // Seven in the evening in Los Angeles on the 14th is the 15th in UTC.
    await publishActivity(store, {
      ...ride("late", 14),
      startedAt: "2026-03-15T02:00:00.000Z",
    });
    const now = new Date("2026-03-15T03:00:00Z");

    const [late] = await queryRecentRides(db, now);

    expect(recencyLabel(rideWhen(late!), siteWallClock(now))).toBe("today");
  });

  it("renders an empty rail from an empty database", async () => {
    expect(await queryRecentRides(db, NOW)).toEqual([]);
  });
});

describe("queryRecentRepos", () => {
  it("takes the latest few old repos", async () => {
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

    const repos = await queryRecentRepos(db, NOW);

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

    const repos = await queryRecentRepos(db, NOW);

    expect(repos.map((r) => `${r.owner}/${r.name}`)).toEqual([
      "other/dotfiles",
      "bendrucker/kept",
    ]);
  });

  it("renders an empty rail from an empty database", async () => {
    expect(await queryRecentRepos(db, NOW)).toEqual([]);
  });
});

describe("recentWindow", () => {
  const now = new Date("2026-03-15T12:00:00Z");
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  test.each<{ name: string; ages: number[]; expected: number }>([
    { name: "nothing", ages: [], expected: 0 },
    { name: "one old item", ages: [90], expected: 1 },
    {
      name: "a quiet month keeps the latest few",
      ages: [40, 50, 60, 70],
      expected: RECENT_MIN,
    },
    { name: "a normal month", ages: [1, 5, 12, 20, 29, 31, 45], expected: 5 },
    {
      name: "a busy month is capped",
      ages: Array.from({ length: 30 }, (_, i) => i),
      expected: RECENT_MAX,
    },
  ])("$name", ({ ages, expected }) => {
    const items = ages.map((age) => daysAgo(age));
    expect(recentWindow(items, (item) => item, now)).toEqual(
      items.slice(0, expected),
    );
  });
});
