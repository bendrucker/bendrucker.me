import type { Kysely } from "kysely";
import { queryLatestRides, wallClock } from "@/activity/feed";
import { queryRepos } from "@/activity/query";
import type { Repo, Ride } from "@/activity/types";
import { parseRideTime } from "@/components/cycling/datetime";
import { SITE } from "@/config";
import type { Database } from "@/db";
import { differenceInCalendarDays } from "date-fns";

export const RECENT_DAYS = 30;
/** What a rail shows when the window holds less than this: the latest few. */
export const RECENT_MIN = 3;
/** Where a busy month gets cut off: a tease, with the totals beneath it. */
export const RECENT_MAX = 6;

export interface WindowSize {
  min: number;
  max: number;
}

const RAIL: WindowSize = { min: RECENT_MIN, max: RECENT_MAX };
/** Two shelves share the code rail, so each takes about half of one rail. */
const SHELF: WindowSize = { min: 2, max: 3 };

/**
 * Personal repositories touched so often they would hold the code rail
 * every week. Leaving them out is what lets the rail say something new.
 */
export const EVERYDAY_REPOS = new Set(["bendrucker.me", "claude", "dotfiles"]);

function isEveryday(repo: Repo): boolean {
  return repo.owner === SITE.githubUsername && EVERYDAY_REPOS.has(repo.name);
}

/**
 * An instant as the site's own wall clock. Calendar words like "today" are
 * compared on wall clocks: a ride's own, and the site's for everything else.
 * The Worker keeps UTC, where a San Francisco evening is already tomorrow.
 */
export function siteWallClock(instant: Date): Date {
  return parseRideTime(wallClock(instant.toISOString(), SITE.timezone));
}

export const rideWhen = (ride: Ride): Date => parseRideTime(ride.startedAt);

export const repoWhen = (repo: Repo): Date =>
  siteWallClock(new Date(repo.lastActivity));

/**
 * The items from the last `RECENT_DAYS`, never fewer than the size's `min`
 * when older ones exist and never more than its `max`. The list arrives
 * newest first, so the window is a prefix of it.
 */
export function recentWindow<T>(
  items: readonly T[],
  when: (item: T) => Date,
  now: Date,
  size: WindowSize = RAIL,
): T[] {
  const inWindow = items.filter(
    (item) => differenceInCalendarDays(now, when(item)) < RECENT_DAYS,
  );
  const count = Math.min(Math.max(inWindow.length, size.min), size.max);
  return items.slice(0, count);
}

/** The code rail's two shelves, each most recently touched first. */
export interface RepoShelves {
  /** Repositories other people own. */
  contributions: Repo[];
  /** My own, minus the everyday ones. */
  personal: Repo[];
}

export interface RecentActivity {
  /** Newest first. */
  rides: Ride[];
  repos: RepoShelves;
}

export async function queryRecentRides(
  db: Kysely<Database>,
  now: Date = new Date(),
): Promise<Ride[]> {
  const rides = await queryLatestRides(db, RECENT_MAX);
  return recentWindow(rides, rideWhen, siteWallClock(now));
}

/**
 * The head of the code page's own query for each owner, which already
 * orders by last contribution, minus the everyday repositories. Each shelf
 * gets a page of its own, so a run of personal work cannot push the
 * contributions off the first page before the shelf is cut.
 */
export async function queryRecentRepos(
  db: Kysely<Database>,
  now: Date = new Date(),
): Promise<RepoShelves> {
  const today = siteWallClock(now);
  const [external, personal] = await Promise.all([
    queryRepos(db, { owner: "external" }),
    queryRepos(db, { owner: "personal" }),
  ]);
  return {
    contributions: recentWindow(external.repos, repoWhen, today, SHELF),
    personal: recentWindow(
      personal.repos.filter((repo) => !isEveryday(repo)),
      repoWhen,
      today,
      SHELF,
    ),
  };
}
