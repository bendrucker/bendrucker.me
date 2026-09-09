import type { Kysely } from "kysely";
import { queryCyclingActivity } from "@/activity/feed";
import { queryRepos } from "@/activity/query";
import type { Repo, Ride } from "@/activity/types";
import { rideTraits } from "@/components/cycling/character";
import { parseRideTime } from "@/components/cycling/datetime";
import { SITE } from "@/config";
import type { Database } from "@/db";
import { differenceInCalendarDays } from "date-fns";

/** How many items each homepage rail holds. */
export const RECENT_COUNT = 3;

/**
 * Personal repositories touched so often they would hold the code rail
 * every week. Leaving them out is what lets the rail say something new.
 */
export const EVERYDAY_REPOS = new Set(["bendrucker.me", "claude", "dotfiles"]);

function isEveryday(repo: Repo): boolean {
  return repo.owner === SITE.githubUsername && EVERYDAY_REPOS.has(repo.name);
}

/** The last seven days in the numbers a sentence can carry. */
export interface WeekSummary {
  rideCount: number;
  distanceMi: number;
  raceCount: number;
  repoCount: number;
}

export interface RecentActivity {
  /** Newest first, each carrying its track. */
  rides: Ride[];
  /** Most recently touched first. */
  repos: Repo[];
  week: WeekSummary;
}

const WEEK_DAYS = 7;

function withinWeek(date: Date, now: Date): boolean {
  const days = differenceInCalendarDays(now, date);
  return days >= 0 && days < WEEK_DAYS;
}

export function summarizeWeek(
  rides: readonly Ride[],
  repos: readonly Repo[],
  now: Date,
): WeekSummary {
  const week = rides.filter((ride) =>
    withinWeek(parseRideTime(ride.startedAt), now),
  );
  return {
    rideCount: week.length,
    distanceMi: week.reduce((sum, ride) => sum + (ride.distanceMi ?? 0), 0),
    raceCount: week.filter((ride) =>
      rideTraits(ride).some((trait) => trait.kind === "race"),
    ).length,
    repoCount: repos.filter((repo) =>
      withinWeek(new Date(repo.lastActivity), now),
    ).length,
  };
}

/**
 * The head of each activity page's own query. The cycling feed lays the log
 * out and attaches tracks to the rides in its window, so the first rides of
 * its first months arrive ready to draw, and the repo query already orders by
 * last contribution, minus the everyday repositories.
 */
export async function queryRecentActivity(
  db: Kysely<Database>,
  now: Date = new Date(),
): Promise<RecentActivity> {
  const [cycling, code] = await Promise.all([
    queryCyclingActivity(db, now),
    queryRepos(db, {}),
  ]);
  const rides = cycling.months.flatMap((month) => month.rides);
  const repos = code.repos.filter((repo) => !isEveryday(repo));
  return {
    rides: rides.slice(0, RECENT_COUNT),
    repos: repos.slice(0, RECENT_COUNT),
    week: summarizeWeek(rides, repos, now),
  };
}
