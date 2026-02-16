import { fetchGitHubActivity, type RepoActivity } from "@workspace/github";
import { logger } from "@workspace/logger";

interface Env {
  GITHUB_TOKEN: string;
  GITHUB_KV: KVNamespace;
  ACTIVITY_DB: D1Database;
}

async function upsertActivityToD1(
  db: D1Database,
  repos: RepoActivity[],
  year: number,
): Promise<void> {
  const statements: D1PreparedStatement[] = [];

  for (const repo of repos) {
    statements.push(
      db
        .prepare(
          `INSERT INTO repos (owner, name, description, url, primary_language_name, primary_language_color, stargazer_count, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(owner, name) DO UPDATE SET
             description=excluded.description,
             url=excluded.url,
             primary_language_name=excluded.primary_language_name,
             primary_language_color=excluded.primary_language_color,
             stargazer_count=excluded.stargazer_count,
             updated_at=datetime('now')`,
        )
        .bind(
          repo.owner,
          repo.name,
          repo.description,
          repo.url,
          repo.primaryLanguage?.name ?? null,
          repo.primaryLanguage?.color ?? null,
          repo.stargazerCount,
          repo.createdAt ? repo.createdAt.toISOString() : null,
        ),
    );

    const lastActivity = repo.lastActivity.toISOString();

    statements.push(
      db
        .prepare(
          `INSERT INTO repo_activity (repo_id, year, pr_count, review_count, issue_count, merge_count, has_merged_prs, last_activity)
           VALUES ((SELECT id FROM repos WHERE owner=? AND name=?), ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(repo_id, year) DO UPDATE SET
             pr_count=excluded.pr_count,
             review_count=excluded.review_count,
             issue_count=excluded.issue_count,
             merge_count=excluded.merge_count,
             has_merged_prs=excluded.has_merged_prs,
             last_activity=excluded.last_activity`,
        )
        .bind(
          repo.owner,
          repo.name,
          year,
          repo.activitySummary.prCount,
          repo.activitySummary.reviewCount,
          repo.activitySummary.issueCount,
          repo.activitySummary.mergeCount,
          repo.activitySummary.hasMergedPRs ? 1 : 0,
          lastActivity,
        ),
    );
  }

  const BATCH_SIZE = 500;
  let totalResults = 0;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const chunk = statements.slice(i, i + BATCH_SIZE);
    const results = await db.batch(chunk);
    totalResults += results.length;
  }
  logger.info(
    {
      statements: statements.length,
      results: totalResults,
      year,
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
  const { repos: activityData } = await fetchGitHubActivity(env.GITHUB_TOKEN, {
    username: "bendrucker",
    title: "Ben Drucker",
    from: yearStart,
    to: now,
  });

  // Store in KV with TTL of 7 days (longer than cron interval for resilience)
  await env.GITHUB_KV.put("activity", JSON.stringify(activityData), {
    expirationTtl: 7 * 24 * 60 * 60, // 7 days
    metadata: {
      lastUpdated: new Date().toISOString(),
      repositoryCount: activityData.length,
      fetchDurationMs: Date.now() - startTime,
    },
  });

  const year = now.getFullYear();
  let d1Success = true;
  try {
    await upsertActivityToD1(env.ACTIVITY_DB, activityData, year);
  } catch (error) {
    d1Success = false;
    logger.error({ error }, "Failed to upsert activity to D1");
  }

  const durationMs = Date.now() - startTime;
  logger.info(
    {
      repositoryCount: activityData.length,
      durationMs,
      d1Success,
    },
    d1Success
      ? "Stored GitHub activity data"
      : "Stored GitHub activity data (KV only, D1 failed)",
  );
  return activityData;
}

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const startTime = Date.now();

        try {
          await updateGitHubActivity(env);
        } catch (error) {
          logger.error({ error }, "Failed to update GitHub activity");

          // Store error info in KV for debugging (with shorter TTL)
          try {
            await env.GITHUB_KV.put(
              "activity-error",
              JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
                duration: Date.now() - startTime,
              }),
              { expirationTtl: 60 * 60 }, // 1 hour
            );
          } catch (kvError) {
            logger.error(
              { error: kvError },
              "Failed to store error info in KV",
            );
          }

          throw error;
        }
      })(),
    );
  },
};
