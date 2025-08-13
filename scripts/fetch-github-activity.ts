#!/usr/bin/env tsx

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { fetchGitHubActivityWithConfig } from "../src/services/github";
import { logger } from "@workspace/logger";

async function main() {
  const startTime = Date.now();

  try {
    logger.info("Getting GitHub token from gh CLI");

    // Get GitHub token from gh CLI
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
    const activityData = await fetchGitHubActivityWithConfig(token);

    // Write to a local JSON file for development
    const outputPath = join(process.cwd(), "tmp", "github-activity.json");
    writeFileSync(outputPath, JSON.stringify(activityData, null, 2));

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
      logger.warn("No repositories with activity found in the last 6 months");
      return;
    }

    // Show summary
    const summary = activityData.slice(0, 5).map((repo) => ({
      repo: `${repo.owner}/${repo.name}`,
      lastActivity: repo.lastActivity.toISOString().split("T")[0],
      prs: repo.activitySummary.prCount,
      reviews: repo.activitySummary.reviewCount,
      issues: repo.activitySummary.issueCount,
    }));

    logger.info({ summary }, "Top 5 repositories by activity");

    // Show totals
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

main();
