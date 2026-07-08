import type { RepoActivity } from "@workspace/github";
import { logger } from "@workspace/logger";
import type { CompiledQuery } from "kysely";
import { createDb } from "../../src/db";
import { upsertRepo, upsertActivity } from "../../src/activity/upsert";
import { fetchGitHubActivityWithConfig } from "../../src/services/github";

interface Env {
  GITHUB_TOKEN: string;
  ACTIVITY_DB: D1Database;
}

const BATCH_SIZE = 500;

function prepare(d1: D1Database, query: CompiledQuery): D1PreparedStatement {
  return d1.prepare(query.sql).bind(...query.parameters);
}

async function upsertActivityToD1(
  d1: D1Database,
  repos: RepoActivity[],
): Promise<void> {
  const db = createDb(d1);

  const statements: D1PreparedStatement[] = [];
  for (const repo of repos) {
    statements.push(prepare(d1, upsertRepo(db, repo).compile()));
    statements.push(prepare(d1, upsertActivity(db, repo).compile()));
  }

  let totalResults = 0;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const chunk = statements.slice(i, i + BATCH_SIZE);
    const results = await d1.batch(chunk);
    totalResults += results.length;
  }

  logger.info(
    {
      statements: statements.length,
      results: totalResults,
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
