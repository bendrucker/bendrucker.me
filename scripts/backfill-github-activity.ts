#!/usr/bin/env tsx

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseArgs } from "util";
import {
  fetchGitHubActivity,
  GITHUB_EPOCH_YEAR,
  type GitHubConfig,
  type RepoActivity,
  type RateLimit,
} from "@workspace/github";
import { logger } from "@workspace/logger";
import { connectD1, formatSql, executeRemote } from "./d1";
import { upsertRepo, upsertActivity } from "./upsert";

async function rateLimitBackoff(rateLimit: RateLimit): Promise<void> {
  const { remaining, cost, resetAt } = rateLimit;
  const resetMs = Math.max(0, new Date(resetAt).getTime() - Date.now());
  const resetSeconds = Math.ceil(resetMs / 1000);

  if (remaining < cost * 2) {
    logger.warn(
      { remaining, resetSeconds },
      "Rate limit nearly exhausted, waiting for reset",
    );
    await new Promise((r) => setTimeout(r, resetMs + 1000));
  } else if (remaining < 500) {
    const delayMs = Math.max(1000, Math.ceil(resetMs / (remaining / cost)));
    logger.info(
      { remaining, delayMs: Math.round(delayMs) },
      "Rate limit low, throttling",
    );
    await new Promise((r) => setTimeout(r, delayMs));
  } else {
    await new Promise((r) => setTimeout(r, 1000));
  }
}

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function mergeRepos(a: RepoActivity[], b: RepoActivity[]): RepoActivity[] {
  const map = new Map<string, RepoActivity>();

  for (const repo of [...a, ...b]) {
    const key = `${repo.owner}/${repo.name}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...repo, activitySummary: { ...repo.activitySummary } });
      continue;
    }

    if (repo.lastActivity > existing.lastActivity) {
      existing.lastActivity = repo.lastActivity;
    }

    existing.activitySummary.prCount += repo.activitySummary.prCount;
    existing.activitySummary.reviewCount += repo.activitySummary.reviewCount;
    existing.activitySummary.issueCount += repo.activitySummary.issueCount;
    existing.activitySummary.mergeCount += repo.activitySummary.mergeCount;
    existing.activitySummary.hasMergedPRs ||= repo.activitySummary.hasMergedPRs;
  }

  return Array.from(map.values());
}

async function fetchWithSplitting(
  token: string,
  config: GitHubConfig,
  from: Date,
  to: Date,
): Promise<{ repos: RepoActivity[]; rateLimit: RateLimit }> {
  const result = await fetchGitHubActivity(token, { ...config, from, to });

  if (!result.truncated) {
    return result;
  }

  const rangeMs = to.getTime() - from.getTime();
  if (rangeMs <= ONE_MONTH_MS) {
    logger.warn(
      { from: from.toISOString(), to: to.toISOString() },
      "Window at minimum size (1 month) but still truncated",
    );
    return result;
  }

  const mid = new Date(from.getTime() + rangeMs / 2);
  logger.info(
    {
      from: from.toISOString(),
      mid: mid.toISOString(),
      to: to.toISOString(),
    },
    "Splitting truncated window",
  );

  const first = await fetchWithSplitting(token, config, from, mid);
  await rateLimitBackoff(first.rateLimit);
  const second = await fetchWithSplitting(token, config, mid, to);

  return {
    repos: mergeRepos(first.repos, second.repos),
    rateLimit: second.rateLimit,
  };
}

async function main() {
  let token: string;
  try {
    token = execSync("gh auth token", { encoding: "utf-8" }).trim();
  } catch {
    throw new Error("Failed to get GitHub token. Run `gh auth login` first.");
  }

  const cacheDir = join(process.cwd(), "tmp", "backfill");
  mkdirSync(cacheDir, { recursive: true });

  const { values } = parseArgs({
    options: {
      from: { type: "string" },
      remote: { type: "boolean", default: false },
    },
  });

  const currentYear = new Date().getFullYear();
  const startYear = values.from ? Number(values.from) : GITHUB_EPOCH_YEAR;

  for (let year = startYear; year <= currentYear; year++) {
    const cacheFile = join(cacheDir, `${year}.json`);

    if (existsSync(cacheFile)) {
      logger.info({ year }, "Skipping year (cached)");
      continue;
    }

    const from = new Date(year, 0, 1);
    const to =
      year === currentYear ? new Date() : new Date(year, 11, 31, 23, 59, 59);

    logger.info(
      { year, from: from.toISOString(), to: to.toISOString() },
      "Fetching year",
    );

    const config = {
      username: "bendrucker",
      title: "Ben Drucker",
    };

    const { repos: data, rateLimit } = await fetchWithSplitting(
      token,
      config,
      from,
      to,
    );

    writeFileSync(cacheFile, JSON.stringify(data, null, 2));
    logger.info({ year, repos: data.length }, "Fetched and cached year");

    if (year < currentYear) {
      await rateLimitBackoff(rateLimit);
    }
  }

  logger.info("Loading cached data for D1 import...");

  const remote = values.remote;
  const allRepos: RepoActivity[] = [];

  for (let year = startYear; year <= currentYear; year++) {
    const cacheFile = join(cacheDir, `${year}.json`);
    if (!existsSync(cacheFile)) continue;
    allRepos.push(...JSON.parse(readFileSync(cacheFile, "utf-8")));
  }

  const { db, dispose } = await connectD1();
  try {
    if (remote) {
      const statements = allRepos.flatMap((repo) => [
        formatSql(upsertRepo(db, repo).compile()),
        formatSql(upsertActivity(db, repo).compile()),
      ]);
      executeRemote(statements);
    } else {
      for (const repo of allRepos) {
        await upsertRepo(db, repo).execute();
        await upsertActivity(db, repo).execute();
      }
    }
  } finally {
    await dispose();
  }

  logger.info(
    { statements: allRepos.length * 2, remote },
    "Imported activity data to D1",
  );
}

main().catch((error) => {
  logger.error(
    { error: error instanceof Error ? error.message : error },
    "Backfill failed",
  );
  process.exit(1);
});
