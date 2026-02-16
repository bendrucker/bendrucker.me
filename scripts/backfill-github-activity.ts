#!/usr/bin/env tsx

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { parseArgs } from "util";
import {
  fetchGitHubActivity,
  GITHUB_EPOCH_YEAR,
  type RepoActivity,
  type RateLimit,
} from "@workspace/github";
import { logger } from "@workspace/logger";
import { sql } from "./sql";

function repoUpsertSQL(repo: RepoActivity): string {
  return sql`
INSERT INTO repos (
  owner, name, description, url,
  primary_language_name, primary_language_color,
  stargazer_count, created_at
) VALUES (
  ${repo.owner}, ${repo.name}, ${repo.description}, ${repo.url},
  ${repo.primaryLanguage?.name ?? null}, ${repo.primaryLanguage?.color ?? null},
  ${repo.stargazerCount}, ${repo.createdAt ? new Date(repo.createdAt).toISOString() : null}
)
ON CONFLICT(owner, name) DO UPDATE SET
  description = excluded.description,
  url = excluded.url,
  primary_language_name = excluded.primary_language_name,
  primary_language_color = excluded.primary_language_color,
  stargazer_count = excluded.stargazer_count,
  updated_at = datetime('now');`;
}

function activityUpsertSQL(repo: RepoActivity): string {
  const lastActivity = Math.floor(new Date(repo.lastActivity).getTime() / 1000);
  return sql`
INSERT INTO repo_activity (
  repo_id, pr_count, review_count,
  issue_count, merge_count, has_merged_prs, last_activity
) VALUES (
  (SELECT id FROM repos WHERE owner = ${repo.owner} AND name = ${repo.name}),
  ${repo.activitySummary.prCount}, ${repo.activitySummary.reviewCount},
  ${repo.activitySummary.issueCount}, ${repo.activitySummary.mergeCount},
  ${repo.activitySummary.hasMergedPRs}, ${lastActivity}
)
ON CONFLICT(repo_id, year) DO UPDATE SET
  pr_count = excluded.pr_count,
  review_count = excluded.review_count,
  issue_count = excluded.issue_count,
  merge_count = excluded.merge_count,
  has_merged_prs = excluded.has_merged_prs,
  last_activity = excluded.last_activity;`;
}

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
    options: { from: { type: "string" } },
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
      year === currentYear
        ? new Date()
        : new Date(year, 11, 31, 23, 59, 59);

    logger.info(
      { year, from: from.toISOString(), to: to.toISOString() },
      "Fetching year",
    );

    const { repos: data, rateLimit } = await fetchGitHubActivity(token, {
      username: "bendrucker",
      title: "Ben Drucker",
      from,
      to,
    });

    writeFileSync(cacheFile, JSON.stringify(data, null, 2));
    logger.info({ year, repos: data.length }, "Fetched and cached year");

    if (year < currentYear) {
      await rateLimitBackoff(rateLimit);
    }
  }

  logger.info("Loading cached data for D1 import...");

  const allStatements: string[] = [];

  for (let year = startYear; year <= currentYear; year++) {
    const cacheFile = join(cacheDir, `${year}.json`);
    if (!existsSync(cacheFile)) continue;

    const repos: RepoActivity[] = JSON.parse(
      readFileSync(cacheFile, "utf-8"),
    );

    for (const repo of repos) {
      allStatements.push(repoUpsertSQL(repo));
      allStatements.push(activityUpsertSQL(repo));
    }
  }

  const sqlFile = join(cacheDir, "import.sql");
  writeFileSync(sqlFile, allStatements.join("\n"));
  logger.info(
    { statements: allStatements.length, file: sqlFile },
    "Generated SQL import file",
  );

  logger.info("Run the following to import to local D1:");
  logger.info(
    `  wrangler d1 execute bendrucker-activity --local --file=${sqlFile}`,
  );
  logger.info("For production:");
  logger.info(
    `  wrangler d1 execute bendrucker-activity --remote --file=${sqlFile}`,
  );
}

main().catch((error) => {
  logger.error(
    { error: error instanceof Error ? error.message : error },
    "Backfill failed",
  );
  process.exit(1);
});
