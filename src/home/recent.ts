import type { Kysely } from "kysely";
import { queryLatestRides } from "@/activity/feed";
import { queryRepos } from "@/activity/query";
import type { Repo, Ride } from "@/activity/types";
import { SITE } from "@/config";
import type { Database } from "@/db";

/** How many of each the homepage shows: a tease, with the rest a link away. */
export const RECENT_COUNT = 3;

/**
 * Personal repositories touched so often they would hold the list every
 * week. Leaving them out is what lets it say something new.
 */
export const EVERYDAY_REPOS = new Set(["bendrucker.me", "claude", "dotfiles"]);

function isEveryday(repo: Repo): boolean {
  return repo.owner === SITE.githubUsername && EVERYDAY_REPOS.has(repo.name);
}

export interface RecentActivity {
  /** Newest first. */
  rides: Ride[];
  /** Most recently touched first. */
  repos: Repo[];
}

export async function queryRecentRides(db: Kysely<Database>): Promise<Ride[]> {
  return queryLatestRides(db, RECENT_COUNT);
}

/**
 * The head of the code page's own query, which already orders by last
 * contribution, minus the everyday repositories. A page holds more than
 * enough to cover the few left out.
 */
export async function queryRecentRepos(db: Kysely<Database>): Promise<Repo[]> {
  const { repos } = await queryRepos(db, {});
  return repos.filter((repo) => !isEveryday(repo)).slice(0, RECENT_COUNT);
}
