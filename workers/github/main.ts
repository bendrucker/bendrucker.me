import { fetchGitHubActivity, type RepoActivity } from "@workspace/github";
import { logger } from "@workspace/logger";

interface Env {
  GITHUB_TOKEN: string;
  GITHUB_KV: KVNamespace;
}

async function updateGitHubActivity(env: Env): Promise<RepoActivity[]> {
  const startTime = Date.now();

  logger.info("Fetching GitHub activity data");

  if (!env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }

  const activityData = await fetchGitHubActivity(env.GITHUB_TOKEN, {
    username: "bendrucker",
    title: "Ben Drucker",
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

  const durationMs = Date.now() - startTime;
  logger.info("Stored GitHub activity data", {
    repositoryCount: activityData.length,
    durationMs,
  });
  return activityData;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const startTime = Date.now();

    try {
      await updateGitHubActivity(env);
    } catch (error) {
      logger.error("Failed to update GitHub activity", { error });

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
        logger.error("Failed to store error info in KV", { error: kvError });
      }

      throw error;
    }
  },
};
