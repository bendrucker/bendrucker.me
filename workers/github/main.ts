import type { RepoActivity } from "@workspace/github";
import { logger } from "@workspace/logger";
import type { CompiledQuery } from "kysely";
import { createDb } from "../../src/db";
import { activityStatements } from "../../src/activity/upsert";
import {
  hashStatements,
  readSyncState,
  recordSync,
} from "../../src/activity/sync-state";
import { fetchGitHubActivityWithConfig } from "../../src/services/github";

type Env = Required<Cloudflare.Env> & {
  GITHUB_TOKEN: string;
};

const BATCH_SIZE = 500;

function prepare(d1: D1Database, query: CompiledQuery): D1PreparedStatement {
  return d1.prepare(query.sql).bind(...query.parameters);
}

async function upsertActivityToD1(
  d1: D1Database,
  repos: RepoActivity[],
): Promise<void> {
  const db = createDb(d1);

  const queries = activityStatements(db, repos);
  const payloadHash = await hashStatements(queries);

  const state = await readSyncState(db);
  if (state?.payloadHash === payloadHash) {
    logger.info(
      { version: state.version, statements: queries.length },
      "GitHub payload unchanged, skipped D1 write",
    );
    return;
  }

  const statements = queries.map((query) => prepare(d1, query));

  let changes = 0;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const chunk = statements.slice(i, i + BATCH_SIZE);
    const results = await d1.batch(chunk);
    changes += results.reduce(
      (total, result) => total + result.meta.changes,
      0,
    );
  }

  // A differing payload does not guarantee a differing database: dropping a
  // repo from the fetch, or a change to an insert-only column like
  // `created_at`, leaves every guarded statement a no-op. The version has to
  // track the rows, since that is what the cached pages render.
  const { version } = await recordSync(db, {
    payloadHash,
    changed: changes > 0,
  }).executeTakeFirstOrThrow();

  logger.info(
    {
      statements: statements.length,
      changes,
      version,
    },
    "D1 upsert completed",
  );
}

async function updateGitHubActivity(env: Env): Promise<RepoActivity[]> {
  const startTime = Date.now();

  logger.info("Fetching GitHub activity data");

  if (!env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const { repos: activityData } = await fetchGitHubActivityWithConfig(
    env.GITHUB_TOKEN,
    { from: yearStart, to: now },
  );

  await upsertActivityToD1(env.ACTIVITY_DB, activityData);

  const durationMs = Date.now() - startTime;
  logger.info(
    {
      repositoryCount: activityData.length,
      durationMs,
    },
    "Stored GitHub activity data",
  );
  return activityData;
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(updateGitHubActivity(env));
  },
};
