#!/usr/bin/env tsx

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import type { RepoActivity } from "@workspace/github";
import { fetchGitHubActivityWithConfig } from "../src/services/github";
import { logger } from "@workspace/logger";
import { sql } from "./sql";

async function main() {
  const startTime = Date.now();

  try {
    logger.info("Getting GitHub token from gh CLI");

    let token: string;
    try {
      token = execSync("gh auth token", { encoding: "utf-8" }).trim();
    } catch {
      throw new Error("Failed to get GitHub token. Run `gh auth login` first.");
    }

    if (!token) {
      throw new Error("No GitHub token found. Run `gh auth login` first.");
    }

    logger.info("Fetching GitHub activity data");
    const { repos: activityData } = await fetchGitHubActivityWithConfig(token);

    const outputPath = join(process.cwd(), "tmp", "github-activity.json");
    writeFileSync(outputPath, JSON.stringify(activityData, null, 2));

    const remote = process.argv.includes("--remote");
    importToD1(activityData, remote);

    const duration = Date.now() - startTime;
    logger.info(
      {
        repositoryCount: activityData.length,
        durationMs: duration,
        outputPath,
      },
      "GitHub activity fetch completed",
    );

    if (activityData.length === 0) {
      logger.warn("No repositories with activity found in the last year");
      return;
    }

    const summary = activityData.slice(0, 5).map((repo) => ({
      repo: `${repo.owner}/${repo.name}`,
      lastActivity: repo.lastActivity.toISOString().split("T")[0],
      prs: repo.activitySummary.prCount,
      reviews: repo.activitySummary.reviewCount,
      issues: repo.activitySummary.issueCount,
    }));

    logger.info({ summary }, "Top 5 repositories by activity");

    const totals = activityData.reduce(
      (acc, repo) => ({
        prs: acc.prs + repo.activitySummary.prCount,
        reviews: acc.reviews + repo.activitySummary.reviewCount,
        issues: acc.issues + repo.activitySummary.issueCount,
      }),
      { prs: 0, reviews: 0, issues: 0 },
    );

    logger.info(
      {
        totalPRs: totals.prs,
        totalReviews: totals.reviews,
        totalIssues: totals.issues,
      },
      "Total GitHub activity summary",
    );
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : error,
      },
      "Failed to fetch GitHub activity",
    );
    process.exit(1);
  }
}

function importToD1(activityData: RepoActivity[], remote: boolean) {
  const sqlStatements: string[] = [];

  for (const repo of activityData) {
    const lastActivity = Math.floor(
      new Date(repo.lastActivity).getTime() / 1000,
    );

    sqlStatements.push(sql`
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
  updated_at = datetime('now');`);

    sqlStatements.push(sql`
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
  last_activity = excluded.last_activity;`);
  }

  const sqlFile = join(process.cwd(), "tmp", "activity-import.sql");
  writeFileSync(sqlFile, sqlStatements.join("\n"));

  try {
    const target = remote ? "--remote" : "--local";
    execSync(
      `wrangler d1 execute bendrucker-activity ${target} --file=${sqlFile}`,
      { encoding: "utf-8" },
    );
    logger.info({ remote }, "Imported activity data to D1");
  } catch (e) {
    logger.warn(
      { error: e instanceof Error ? e.message : e },
      `Failed to import to D1 (run wrangler d1 migrations apply bendrucker-activity ${remote ? "--remote" : "--local"} first)`,
    );
  }
}

main();
