import { logger } from "@workspace/logger";
import { d1Store } from "../../src/activity/store";
import { fetchActivity, fetchWork } from "../../src/activity/github";
import { syncActivity } from "../../src/activity/sync";
import type { Kysely } from "kysely";
import type { RepoActivity, WorkItems } from "@workspace/github";
import type { Database } from "../../src/db";

type Env = Required<Cloudflare.Env> & {
  GITHUB_TOKEN: string;
};

// The pull request and issue details are a refinement of the yearly sync, so a
// failure reading them is logged and the repositories still sync without them.
async function fetchWorkOrNone(
  token: string,
  db: Kysely<Database>,
  repos: readonly RepoActivity[],
): Promise<WorkItems> {
  try {
    return await fetchWork(token, db, repos);
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to fetch pull requests and issues, syncing without them",
    );
    return { pullRequests: [], issues: [] };
  }
}

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

  const store = d1Store(env.ACTIVITY_DB);
  const work = await fetchWorkOrNone(env.GITHUB_TOKEN, store.db, repos);
  const result = await syncActivity(store, repos, { work });

  logger.info(
    {
      repositoryCount: repos.length,
      pullRequestCount: work.pullRequests.length,
      issueCount: work.issues.length,
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
