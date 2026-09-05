import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Kysely } from "kysely";
import type { Database } from "@/db";
import { createTestDb } from "@/test/db";
import { readSyncState, recordSync } from "./sync-state";

describe("sync state", () => {
  let db: Kysely<Database>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("starts at version zero with no payload hash", async () => {
    expect(await readSyncState(db)).toMatchObject({
      version: 0,
      payloadHash: null,
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
    expect(await readSyncState(db)).toMatchObject({
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
