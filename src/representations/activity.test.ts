import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { APIContext } from "astro";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, seed, type SeedRepo } from "@/test/db";

let db: Kysely<Database>;

vi.mock("@/db", () => ({
  getDb: () => Promise.resolve(db),
}));

const { activity, activityYear } = await import("./activity");

// The `year` column is generated from `lastActivity`, so these timestamps
// place one repo in 2024 and the other in 2025.
const FIXTURES: SeedRepo[] = [
  {
    owner: "bendrucker",
    name: "cool-lib",
    description: "A cool library",
    primaryLanguageName: "TypeScript",
    stargazerCount: 100,
    activity: [{ lastActivity: 1718000000, prCount: 5 }],
  },
  {
    owner: "bendrucker",
    name: "newer-lib",
    activity: [{ lastActivity: 1750000000, prCount: 2 }],
  },
];

function context(params: Record<string, string>): APIContext {
  return { params } as unknown as APIContext;
}

beforeEach(async () => {
  db = createTestDb();
  await seed(db, FIXTURES);
});

afterEach(async () => {
  await db.destroy();
});

describe("activity", () => {
  it("renders every repository", async () => {
    const md = await activity.render(context({}));
    expect(md).toContain("# Code Activity");
    expect(md).toContain("2 repositories.");
    expect(md).toContain("## bendrucker/cool-lib");
    expect(md).toContain("## bendrucker/newer-lib");
  });

  it("lists itself once", async () => {
    expect(await activity.list()).toEqual([
      {
        path: "/activity/code",
        title: "Code Activity",
        description: "Public GitHub activity, indexed by repository.",
      },
    ]);
  });
});

describe("activityYear", () => {
  it("renders only that year's repositories", async () => {
    const md = await activityYear.render(context({ year: "2024" }));
    expect(md).toContain("# Code Activity: 2024");
    expect(md).toContain("1 repositories.");
    expect(md).toContain("## bendrucker/cool-lib");
    expect(md).not.toContain("## bendrucker/newer-lib");
  });

  it("falls through to HTML for a year with no data", async () => {
    expect(await activityYear.render(context({ year: "1999" }))).toBeNull();
  });

  it("falls through to HTML for a non-numeric year", async () => {
    expect(await activityYear.render(context({ year: "og.png" }))).toBeNull();
  });

  it("lists one entry per year with activity", async () => {
    expect(await activityYear.list()).toEqual([
      {
        path: "/activity/code/2025",
        title: "Code Activity: 2025",
        description: "1 repository last contributed to in 2025.",
      },
      {
        path: "/activity/code/2024",
        title: "Code Activity: 2024",
        description: "1 repository last contributed to in 2024.",
      },
    ]);
  });
});
