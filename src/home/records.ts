import { TZDate } from "@date-fns/tz";
import type { Kysely } from "kysely";
import { SITE } from "@/config";
import type { Database } from "@/db";
import { formatStat } from "./format";

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;
/** Below this a ride is a commute, whose numbers nothing here should crown. */
const COMMUTE_MAX_DISTANCE_M = 10_000;
const STARRED_REPOS = 3;

export interface RideRecord {
  name: string;
  year: number;
  stravaUrl?: string;
}

export interface RideRecords {
  longest: (RideRecord & { distanceMi: number }) | null;
  mostClimbing: (RideRecord & { elevationFt: number }) | null;
  longestDay: (RideRecord & { movingHours: number }) | null;
  firstYear: number | null;
  rideCount: number;
  movingHours: number;
}

export interface CodeRecords {
  firstYear: number | null;
  /** The most-starred repositories contributed to that are someone else's. */
  starred: Array<{ owner: string; name: string; url: string }>;
}

const RECORD_COLUMNS = [
  "name",
  "startedAt",
  "timezone",
  "stravaId",
  "distanceM",
  "elevationM",
  "movingS",
] as const;

export async function queryRideRecords(
  db: Kysely<Database>,
): Promise<RideRecords> {
  const rides = db
    .selectFrom("activityFeed")
    .where("sport", "=", "ride")
    .where("distanceM", ">=", COMMUTE_MAX_DISTANCE_M)
    .select(RECORD_COLUMNS);
  const [longest, mostClimbing, longestDay, career] = await Promise.all([
    rides.orderBy("distanceM", "desc").limit(1).executeTakeFirst(),
    rides.orderBy("elevationM", "desc").limit(1).executeTakeFirst(),
    rides.orderBy("movingS", "desc").limit(1).executeTakeFirst(),
    db
      .selectFrom("activityFeed")
      .where("sport", "=", "ride")
      .select((eb) => [
        eb.fn.min("startedAt").as("firstStartedAt"),
        eb.fn.countAll<number>().as("rideCount"),
        eb.fn.sum<number | null>("movingS").as("movingS"),
      ])
      .executeTakeFirstOrThrow(),
  ]);

  return {
    longest: longest
      ? {
          ...record(longest),
          distanceMi: (longest.distanceM ?? 0) / METERS_PER_MILE,
        }
      : null,
    mostClimbing: mostClimbing
      ? {
          ...record(mostClimbing),
          elevationFt: (mostClimbing.elevationM ?? 0) * FEET_PER_METER,
        }
      : null,
    longestDay: longestDay
      ? { ...record(longestDay), movingHours: (longestDay.movingS ?? 0) / 3600 }
      : null,
    firstYear: career.firstStartedAt
      ? rideYear(career.firstStartedAt, SITE.timezone)
      : null,
    rideCount: career.rideCount,
    movingHours: (career.movingS ?? 0) / 3600,
  };
}

type RecordRow = {
  name: string | null;
  startedAt: string;
  timezone: string;
  stravaId: string | null;
};

function record(row: RecordRow): RideRecord {
  return {
    name: row.name ?? "Ride",
    year: rideYear(row.startedAt, row.timezone),
    ...(row.stravaId
      ? { stravaUrl: `https://www.strava.com/activities/${row.stravaId}` }
      : {}),
  };
}

/** The year on the ride's own clock, as the log files it. */
function rideYear(startedAt: string, timezone: string): number {
  return new TZDate(new Date(startedAt), timezone).getFullYear();
}

export async function queryCodeRecords(
  db: Kysely<Database>,
): Promise<CodeRecords> {
  const [first, starred] = await Promise.all([
    db
      .selectFrom("repos")
      .where("owner", "=", SITE.githubUsername)
      .select((eb) => eb.fn.min("createdAt").as("createdAt"))
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("repos")
      .where("owner", "!=", SITE.githubUsername)
      .select(["owner", "name", "url"])
      .orderBy("stargazerCount", "desc")
      .limit(STARRED_REPOS)
      .execute(),
  ]);
  return {
    firstYear: first.createdAt
      ? new Date(first.createdAt).getUTCFullYear()
      : null,
    starred,
  };
}

export interface RecordItem {
  text: string;
  href?: string;
}

/**
 * The lifetime facts under the rails, cycling and code alternating so
 * neither rail reads as the point of the page. A fact whose data is
 * missing drops out rather than reading as zero.
 */
export function recordItems(
  rides: RideRecords,
  code: CodeRecords,
): RecordItem[] {
  const cycling: RecordItem[] = [];
  if (rides.longest) {
    cycling.push({
      text: `Longest ride: ${rides.longest.name}, ${formatStat(rides.longest.distanceMi, "distance")} mi in ${rides.longest.year}`,
      ...(rides.longest.stravaUrl ? { href: rides.longest.stravaUrl } : {}),
    });
  }
  if (rides.firstYear !== null && rides.rideCount > 0) {
    cycling.push({
      text: `${formatStat(rides.rideCount, "count")} rides since ${rides.firstYear}`,
    });
  }
  if (rides.mostClimbing) {
    cycling.push({
      text: `Most climbing: ${rides.mostClimbing.name}, ${formatStat(rides.mostClimbing.elevationFt, "count")} ft in ${rides.mostClimbing.year}`,
      ...(rides.mostClimbing.stravaUrl
        ? { href: rides.mostClimbing.stravaUrl }
        : {}),
    });
  }
  if (rides.movingHours > 0) {
    cycling.push({
      text: `${formatStat(rides.movingHours, "count")} hours in the saddle`,
    });
  }
  if (rides.longestDay) {
    cycling.push({
      text: `Longest day: ${rides.longestDay.name}, ${rides.longestDay.movingHours.toFixed(1)} hours moving`,
      ...(rides.longestDay.stravaUrl
        ? { href: rides.longestDay.stravaUrl }
        : {}),
    });
  }

  const coding: RecordItem[] = [];
  if (code.firstYear !== null) {
    coding.push({
      text: `On GitHub since ${code.firstYear}`,
      href: `https://github.com/${SITE.githubUsername}`,
    });
  }
  for (const repo of code.starred) {
    coding.push({
      text: `Contributor to ${repo.owner}/${repo.name}`,
      href: repo.url,
    });
  }

  const items: RecordItem[] = [];
  const length = Math.max(cycling.length, coding.length);
  for (let i = 0; i < length; i++) {
    const ride = cycling[i];
    const repo = coding[i];
    if (ride) items.push(ride);
    if (repo) items.push(repo);
  }
  return items;
}
