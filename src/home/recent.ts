import type { Kysely } from "kysely";
import { queryCyclingActivity } from "@/activity/feed";
import { queryRepos } from "@/activity/query";
import type { Repo, Ride } from "@/activity/types";
import type { Database } from "@/db";

/** How many items each homepage rail holds. */
export const RECENT_COUNT = 3;

export interface RecentActivity {
  /** Newest first, each carrying its track. */
  rides: Ride[];
  /** Most recently touched first. */
  repos: Repo[];
}

/**
 * The head of each activity page's own query. The cycling feed lays the log
 * out and attaches tracks to the rides in its window, so the first rides of
 * its first months arrive ready to draw, and the repo query already orders by
 * last contribution.
 */
export async function queryRecentActivity(
  db: Kysely<Database>,
  now: Date = new Date(),
): Promise<RecentActivity> {
  const [cycling, code] = await Promise.all([
    queryCyclingActivity(db, now),
    queryRepos(db, {}),
  ]);
  return {
    rides: cycling.months
      .flatMap((month) => month.rides)
      .slice(0, RECENT_COUNT),
    repos: code.repos.slice(0, RECENT_COUNT),
  };
}
