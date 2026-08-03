import { sql, type CompiledQuery, type Kysely } from "kysely";
import type { Database } from "../db";

const ROW_ID = 1;

export interface SyncState {
  version: number;
  payloadHash: string | null;
}

export function readSyncState(
  db: Kysely<Database>,
): Promise<SyncState | undefined> {
  return db
    .selectFrom("syncState")
    .select(["version", "payloadHash"])
    .where("id", "=", ROW_ID)
    .executeTakeFirst();
}

export interface SyncRecord {
  /** `null` when the writer covered a different dataset than the cron fetches. */
  payloadHash: string | null;
  changed: boolean;
}

export function recordSync(
  db: Kysely<Database>,
  { payloadHash, changed }: SyncRecord,
) {
  const now = sql<string>`datetime('now')`;

  return db
    .updateTable("syncState")
    .set({
      payloadHash,
      syncedAt: now,
      ...(changed ? { version: sql<number>`version + 1`, changedAt: now } : {}),
    })
    .where("id", "=", ROW_ID)
    .returning("version");
}

/**
 * Fingerprints a write batch by its SQL and bound parameters, so a payload that
 * would produce byte-identical statements can skip the batch entirely rather
 * than paying D1's one-row-per-statement floor for a no-op.
 */
export async function hashStatements(
  queries: readonly CompiledQuery[],
): Promise<string> {
  const canonical = JSON.stringify(
    queries.map((query) => [query.sql, query.parameters]),
  );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
