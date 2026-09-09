import type { Kysely } from "kysely";
import { queryCyclingActivity } from "@/activity/feed";
import { queryRepos } from "@/activity/query";
import type { Repo, Ride } from "@/activity/types";
import { parseRideTime } from "@/components/cycling/datetime";
import { SITE } from "@/config";
import type { Database } from "@/db";
import { differenceInCalendarDays } from "date-fns";

export const RECENT_DAYS = 30;
/** What a rail shows when the window holds less than this: the latest few. */
export const RECENT_MIN = 3;
/** Where a busy month gets cut off, so the page has a bottom. */
export const RECENT_MAX = 15;

/**
 * Personal repositories touched so often they would hold the code rail
 * every week. Leaving them out is what lets the rail say something new.
 */
export const EVERYDAY_REPOS = new Set(["bendrucker.me", "claude", "dotfiles"]);

function isEveryday(repo: Repo): boolean {
  return repo.owner === SITE.githubUsername && EVERYDAY_REPOS.has(repo.name);
}

/**
 * The items from the last `RECENT_DAYS`, never fewer than `RECENT_MIN` when
 * older ones exist and never more than `RECENT_MAX`. The list arrives newest
 * first, so the window is a prefix of it.
 */
export function recentWindow<T>(
  items: readonly T[],
  when: (item: T) => Date,
  now: Date,
): T[] {
  const inWindow = items.filter(
    (item) => differenceInCalendarDays(now, when(item)) < RECENT_DAYS,
  );
  const count = Math.min(Math.max(inWindow.length, RECENT_MIN), RECENT_MAX);
  return items.slice(0, count);
}

export interface RecentActivity {
  /** Newest first. */
  rides: Ride[];
  /** Most recently touched first. */
  repos: Repo[];
}

/**
 * The head of each activity page's own query: the cycling feed's months
 * flatten to rides newest first, and the repo query already orders by last
 * contribution, minus the everyday repositories.
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
    rides: recentWindow(
      cycling.months.flatMap((month) => month.rides),
      (ride) => parseRideTime(ride.startedAt),
      now,
    ),
    repos: recentWindow(
      code.repos.filter((repo) => !isEveryday(repo)),
      (repo) => new Date(repo.lastActivity),
      now,
    ),
  };
}
