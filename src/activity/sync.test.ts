import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb, testStore } from "@/test/db";
import type { RepoActivity } from "@workspace/github";
import type { ActivityStore } from "./store";
import { readSyncState } from "./sync-state";
import { syncActivity, syncStatements } from "./sync";

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

describe("syncActivity", () => {
  let db: Kysely<Database>;
  let store: ActivityStore;

  beforeEach(() => {
    db = createTestDb();
    store = testStore(db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("writes the payload and bumps the version on a first run", async () => {
    const result = await syncActivity(store, [makeRepo()]);

    expect(result).toEqual({
      skipped: false,
      statements: 2,
      changes: 2,
      version: 1,
    });

    const stored = await db
      .selectFrom("repos")
      .innerJoin("repoActivity", "repoActivity.repoId", "repos.id")
      .selectAll()
      .executeTakeFirstOrThrow();
    expect(stored.name).toBe("cool-lib");
    expect(stored.prCount).toBe(5);
  });

  it("skips the write when the payload repeats", async () => {
    const repos = [makeRepo()];
    await syncActivity(store, repos);

    expect(await syncActivity(store, repos)).toEqual({
      skipped: true,
      statements: 2,
      changes: 0,
      version: 1,
    });
  });

  it("skips the write however the repos are ordered", async () => {
    const repos = [
      makeRepo({ name: "quibble" }),
      makeRepo({ name: "cool-lib" }),
    ];
    await syncActivity(store, repos);

    const { skipped } = await syncActivity(store, repos.toReversed());
    expect(skipped).toBe(true);
  });

  it("bumps the version when the payload changes a row", async () => {
    await syncActivity(store, [makeRepo()]);

    const result = await syncActivity(store, [
      makeRepo({ stargazerCount: 101 }),
    ]);

    expect(result.skipped).toBe(false);
    expect(result.changes).toBe(1);
    expect(result.version).toBe(2);
  });

  // The rule the version exists for: the cached pages render rows, so a
  // payload that reaches the database as nothing but guarded no-ops leaves
  // them valid. The hash still moves, or the next run would rewrite it.
  it("records the hash without bumping the version when nothing changes", async () => {
    await syncActivity(store, [
      makeRepo({ name: "cool-lib" }),
      makeRepo({ name: "quibble" }),
    ]);
    const before = await readSyncState(db);

    const result = await syncActivity(store, [
      makeRepo({ name: "cool-lib", createdAt: new Date("2019-01-01") }),
    ]);

    expect(result.skipped).toBe(false);
    expect(result.changes).toBe(0);
    expect(result.version).toBe(1);

    const after = await readSyncState(db);
    expect(after?.payloadHash).not.toBe(before?.payloadHash);
  });

  it("applies every statement across more than one batch", async () => {
    const repos = Array.from({ length: 260 }, (_, index) =>
      makeRepo({ name: `repo-${String(index).padStart(3, "0")}` }),
    );

    const sizes: number[] = [];
    const counted: ActivityStore = {
      db,
      batch: (statements) => {
        sizes.push(statements.length);
        return store.batch(statements);
      },
    };

    const result = await syncActivity(counted, repos);

    expect(sizes).toEqual([500, 20]);
    expect(result.changes).toBe(520);
    expect(
      await db
        .selectFrom("repos")
        .select(({ fn }) => fn.countAll<number>().as("count"))
        .executeTakeFirstOrThrow(),
    ).toEqual({ count: 260 });
  });

  it("clears the hash for a payload the cron does not cover", async () => {
    const result = await syncActivity(store, [makeRepo()], {
      recordHash: false,
    });

    expect(result.version).toBe(1);
    expect(await readSyncState(db)).toEqual({ version: 1, payloadHash: null });
  });

  it("writes again after a cleared hash rather than skipping", async () => {
    const repos = [makeRepo()];
    await syncActivity(store, repos, { recordHash: false });

    const { skipped, version } = await syncActivity(store, repos);
    expect(skipped).toBe(false);
    expect(version).toBe(1);
  });
});

describe("syncStatements", () => {
  let db: Kysely<Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("carries the upserts and a hash-clearing version bump", async () => {
    for (const statement of syncStatements(db, [makeRepo()])) {
      await db.executeQuery(statement);
    }

    expect(await db.selectFrom("repos").selectAll().execute()).toHaveLength(1);
    expect(await readSyncState(db)).toEqual({ version: 1, payloadHash: null });
  });
});
