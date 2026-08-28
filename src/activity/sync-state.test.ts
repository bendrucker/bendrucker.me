import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb } from "@/test/db";
import type { RepoActivity } from "@workspace/github";
import { hashStatements, readSyncState, recordSync } from "./sync-state";
import { activityStatements } from "./upsert";

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

describe("sync state", () => {
  let db: Kysely<Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("starts at version zero with no payload hash", async () => {
    expect(await readSyncState(db)).toEqual({ version: 0, payloadHash: null });
  });

  it("bumps the version and records the hash on a real change", async () => {
    const [{ version }] = await recordSync(db, {
      payloadHash: "abc",
      changed: true,
    }).execute();

    expect(version).toBe(1);
    expect(await readSyncState(db)).toEqual({
      version: 1,
      payloadHash: "abc",
    });
  });

  it("records the hash without bumping the version on a no-op run", async () => {
    await recordSync(db, { payloadHash: "abc", changed: true }).execute();
    const before = await db
      .selectFrom("syncState")
      .select("changedAt")
      .executeTakeFirstOrThrow();

    const [{ version }] = await recordSync(db, {
      payloadHash: "reordered",
      changed: false,
    }).execute();

    expect(version).toBe(1);
    expect(await readSyncState(db)).toEqual({
      version: 1,
      payloadHash: "reordered",
    });

    const after = await db
      .selectFrom("syncState")
      .select("changedAt")
      .executeTakeFirstOrThrow();
    expect(after.changedAt).toBe(before.changedAt);
  });
});

describe("hashStatements", () => {
  let db: Kysely<Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("ignores the order repos arrive in", async () => {
    const repos = [
      makeRepo({ owner: "bendrucker", name: "quibble" }),
      makeRepo({ owner: "bendrucker", name: "cool-lib" }),
    ];

    expect(await hashStatements(activityStatements(db, repos))).toBe(
      await hashStatements(activityStatements(db, repos.toReversed())),
    );
  });

  it("changes when any stored value changes", async () => {
    const unchanged = await hashStatements(
      activityStatements(db, [makeRepo()]),
    );

    expect(
      await hashStatements(
        activityStatements(db, [makeRepo({ stargazerCount: 101 })]),
      ),
    ).not.toBe(unchanged);

    expect(
      await hashStatements(
        activityStatements(db, [
          makeRepo({
            activitySummary: {
              prCount: 6,
              reviewCount: 2,
              issueCount: 1,
              mergeCount: 3,
              hasMergedPRs: true,
            },
          }),
        ]),
      ),
    ).not.toBe(unchanged);
  });
});
