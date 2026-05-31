import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb } from "@/test/db";
import type { RepoActivity } from "@workspace/github";
import { upsertRepo, upsertActivity } from "./upsert";

function makeRepo(overrides: Partial<RepoActivity> = {}): RepoActivity {
  return {
    owner: "bendrucker",
    name: "cool-lib",
    description: "A cool library",
    url: "https://github.com/bendrucker/cool-lib",
    lastActivity: new Date("2025-06-01T00:00:00.000Z"),
    createdAt: new Date("2020-01-01T00:00:00.000Z"),
    primaryLanguage: { name: "TypeScript", color: "#3178c6" },
    stargazerCount: 100,
    activitySummary: {
      prCount: 5,
      reviewCount: 2,
      issueCount: 1,
      mergeCount: 3,
      hasMergedPRs: true,
    },
    ...overrides,
  };
}

describe("upsert builders", () => {
  let db: Kysely<Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("inserts a repo and its activity", async () => {
    const repo = makeRepo();
    await upsertRepo(db, repo).execute();
    await upsertActivity(db, repo).execute();

    const stored = await db
      .selectFrom("repos")
      .innerJoin("repoActivity", "repoActivity.repoId", "repos.id")
      .selectAll()
      .executeTakeFirstOrThrow();

    expect(stored.owner).toBe("bendrucker");
    expect(stored.name).toBe("cool-lib");
    expect(stored.primaryLanguageName).toBe("TypeScript");
    expect(stored.primaryLanguageColor).toBe("#3178c6");
    expect(stored.stargazerCount).toBe(100);
    expect(stored.createdAt).toBe("2020-01-01T00:00:00.000Z");
    expect(stored.prCount).toBe(5);
    expect(stored.reviewCount).toBe(2);
    expect(stored.issueCount).toBe(1);
    expect(stored.mergeCount).toBe(3);
    expect(stored.hasMergedPrs).toBe(1);
    expect(stored.lastActivity).toBe(
      Math.floor(repo.lastActivity.getTime() / 1000),
    );
    expect(stored.year).toBe(2025);
  });

  it("updates existing rows on conflict instead of duplicating", async () => {
    const initial = makeRepo();
    await upsertRepo(db, initial).execute();
    await upsertActivity(db, initial).execute();

    const updated = makeRepo({
      description: "An even cooler library",
      stargazerCount: 200,
      lastActivity: new Date("2025-09-01T00:00:00.000Z"),
      activitySummary: {
        prCount: 12,
        reviewCount: 4,
        issueCount: 2,
        mergeCount: 6,
        hasMergedPRs: true,
      },
    });
    await upsertRepo(db, updated).execute();
    await upsertActivity(db, updated).execute();

    const repos = await db.selectFrom("repos").selectAll().execute();
    expect(repos).toHaveLength(1);
    expect(repos[0].description).toBe("An even cooler library");
    expect(repos[0].stargazerCount).toBe(200);

    const activity = await db.selectFrom("repoActivity").selectAll().execute();
    expect(activity).toHaveLength(1);
    expect(activity[0].prCount).toBe(12);
    expect(activity[0].lastActivity).toBe(
      Math.floor(updated.lastActivity.getTime() / 1000),
    );
  });

  it("handles a null primary language", async () => {
    const repo = makeRepo({ primaryLanguage: null });
    await upsertRepo(db, repo).execute();

    const stored = await db
      .selectFrom("repos")
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(stored.primaryLanguageName).toBeNull();
    expect(stored.primaryLanguageColor).toBeNull();
  });
});
