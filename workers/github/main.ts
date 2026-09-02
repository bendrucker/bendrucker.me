import { logger } from "@workspace/logger";
import { d1Store } from "../../src/activity/store";
import { fetchActivity } from "../../src/activity/github";
import { syncActivity } from "../../src/activity/sync";

type Env = Required<Cloudflare.Env> & {
  GITHUB_TOKEN: string;
};

async function updateGitHubActivity(env: Env): Promise<void> {
  const startTime = Date.now();

  logger.info("Fetching GitHub activity data");

  if (!env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const { repos } = await fetchActivity(env.GITHUB_TOKEN, {
    from: yearStart,
    to: now,
  });

  const result = await syncActivity(d1Store(env.ACTIVITY_DB), repos);

  logger.info(
    {
      repositoryCount: repos.length,
      durationMs: Date.now() - startTime,
      ...result,
    },
    result.skipped
      ? "GitHub payload unchanged, skipped D1 write"
      : "Stored GitHub activity data",
  );
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
