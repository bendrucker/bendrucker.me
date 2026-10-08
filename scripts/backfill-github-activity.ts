#!/usr/bin/env tsx

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseArgs } from "util";
import { setTimeout as delay } from "node:timers/promises";
import {
  fetchGitHubActivity,
  GITHUB_EPOCH_YEAR,
  type GitHubConfig,
  type RepoActivity,
  type RateLimit,
} from "@workspace/github";
import { logger } from "@workspace/logger";
import { importActivity } from "./d1";

async function rateLimitBackoff(rateLimit: RateLimit): Promise<void> {
  const { remaining, cost, resetAt } = rateLimit;
  const resetMs = Math.max(0, new Date(resetAt).getTime() - Date.now());
  const resetSeconds = Math.ceil(resetMs / 1000);

  if (remaining < cost * 2) {
    logger.warn(
      { remaining, resetSeconds },
      "Rate limit nearly exhausted, waiting for reset",
    );
    await delay(resetMs + 1000);
  } else if (remaining < 500) {
    const delayMs = Math.max(1000, Math.ceil(resetMs / (remaining / cost)));
    logger.info(
      { remaining, delayMs: Math.round(delayMs) },
      "Rate limit low, throttling",
    );
    await delay(delayMs);
  } else {
    await delay(1000);
  }
}

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

type WorkIdFields = "pullRequestIds" | "issueIds";
type CachedRepo = Omit<RepoActivity, WorkIdFields> &
  Partial<Pick<RepoActivity, WorkIdFields>>;

const hasWorkIds = (repo: CachedRepo): repo is RepoActivity =>
  Array.isArray(repo.pullRequestIds) && Array.isArray(repo.issueIds);

/**
 * A year's repos from the cache, or undefined when it has to be fetched: it
 * was never cached, or it was cached before authored pull requests and issues
 * were tracked, and importing it would store none of them.
 */
function readCachedYear(file: string): RepoActivity[] | undefined {
  if (!existsSync(file)) return undefined;
  const cached: CachedRepo[] = JSON.parse(readFileSync(file, "utf-8"));
  return cached.every((repo) => hasWorkIds(repo)) ? cached : undefined;
}

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
    existing.pullRequestIds = [
      ...existing.pullRequestIds,
      ...repo.pullRequestIds,
    ];
    existing.issueIds = [...existing.issueIds, ...repo.issueIds];
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

  const allRepos: RepoActivity[] = [];

  for (let year = startYear; year <= currentYear; year++) {
    const cacheFile = join(cacheDir, `${year}.json`);
    // The current year is still moving, so it is always read fresh.
    const cached = year === currentYear ? undefined : readCachedYear(cacheFile);

    if (cached) {
      logger.info({ year }, "Using cached year");
      allRepos.push(...cached);
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
    allRepos.push(...data);

    if (year < currentYear) {
      await rateLimitBackoff(rateLimit);
    }
  }

  await importActivity(allRepos, values.remote, token);
}

try {
  await main();
} catch (error) {
  logger.error(
    { error: error instanceof Error ? error.message : error },
    "Backfill failed",
  );
  process.exit(1);
}
