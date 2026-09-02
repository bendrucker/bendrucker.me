// The whole write path from a GitHub fetch to D1: which statements a payload
// produces, whether they are worth running, and what that means for the version
// the cached pages key on.
import type { RepoActivity } from "@workspace/github";
import type { CompiledQuery, Kysely } from "kysely";
import type { Database } from "../db";
import type { ActivityStore } from "./store";
import { hashStatements, readSyncState, recordSync } from "./sync-state";
import { activityStatements } from "./upsert";

// A batch grows with the repo count, so it goes to the store in chunks. The
// sync is the writer that can afford the split: every statement is a guarded
// upsert that stands on its own, so a run that fails between chunks leaves
// rows the next run rewrites.
const BATCH_SIZE = 500;

export interface SyncResult {
  /** The payload matched the last one written, so nothing ran. */
  skipped: boolean;
  statements: number;
  changes: number;
  version: number;
}

export interface SyncOptions {
  /**
   * Leave this payload's hash behind, so an identical next payload can skip the
   * write. False for a writer covering a different window than the hourly cron:
   * that run compares against nothing and always writes, and it clears the
   * hash, so the next cron also finds nothing to match, writes, and
   * establishes a hash over its own dataset.
   */
  recordHash?: boolean;
}

export async function syncActivity(
  store: ActivityStore,
  repos: RepoActivity[],
  { recordHash = true }: SyncOptions = {},
): Promise<SyncResult> {
  const statements = activityStatements(store.db, repos);
  const payloadHash = recordHash ? await hashStatements(statements) : null;

  const state =
    payloadHash === null ? undefined : await readSyncState(store.db);
  if (state?.payloadHash === payloadHash) {
    return {
      skipped: true,
      statements: statements.length,
      changes: 0,
      version: state.version,
    };
  }

  let changes = 0;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    changes += await store.batch(statements.slice(i, i + BATCH_SIZE));
  }

  // A differing payload does not guarantee a differing database: dropping a
  // repo from the fetch, or a change to an insert-only column like
  // `created_at`, leaves every guarded statement a no-op. The version has to
  // track the rows, since that is what the cached pages render.
  const { version } = await recordSync(store.db, {
    payloadHash,
    changed: changes > 0,
  }).executeTakeFirstOrThrow();

  return { skipped: false, statements: statements.length, changes, version };
}

/**
 * The same write as `syncActivity`, compiled for a caller that can only hand
 * SQL to `wrangler d1 execute --remote`. Skipping and the change count both
 * need answers to come back from the database, which over that route they
 * cannot, so this always writes and always bumps the version. The hash it
 * leaves is null, since these repos are not the window the hourly cron
 * fetches and a hash over them would make the cron skip a write it owes.
 */
export function syncStatements(
  db: Kysely<Database>,
  repos: RepoActivity[],
): CompiledQuery[] {
  return [
    ...activityStatements(db, repos),
    recordSync(db, { payloadHash: null, changed: true }).compile(),
  ];
}
