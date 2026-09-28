// The Rides route's reads. Every list on the route is a row of a few values, so
// each query selects only the columns a row needs and leaves the track, the
// profile, and the photos to the ride's own page.
import { sql, type Expression, type Kysely, type SqlBool } from "kysely";
import { lowerBound, pageCursor, upperBound, wallClock } from "@/activity/feed";
import {
  monthAfter,
  monthKeyOf,
  monthsBefore,
} from "@/components/cycling/format";
import type { Database } from "@/db";
import { BIG, RECORD_COUNT, rankHighlights, type Records } from "./rank";
import {
  LADDER_DURATIONS,
  RECORD_ROWS,
  rankPeriods,
  type PeriodRecords,
} from "./records";
import {
  byMonth,
  toTuple,
  type RideMonth,
  type RideRow,
  type RideRowsPage,
  type RideTuple,
} from "./rows";

const ROW_COLUMNS = [
  "activityId",
  "name",
  "description",
  "startedAt",
  "timezone",
  "distanceM",
  "elevationM",
] as const;

/** Months the log renders on first load: the latest ride's and the one before. */
export const FIRST_MONTHS = 2;

/** Months each later page of the log carries. */
export const RIDE_PAGE_MONTHS = 6;

/** Days back from the latest ride the highlights look for big rides in. */
export const HIGHLIGHT_DAYS = 90;

/** Search results the page renders before the reader scrolls for more. */
export const MATCH_COUNT = 60;

const DAY_MS = 24 * 3600 * 1000;

interface RowSource {
  activityId: string;
  name: string | null;
  description: string | null;
  startedAt: string;
  timezone: string;
  distanceM: number | null;
  elevationM: number | null;
}

/** What a row calls a ride nobody named, which search matches like any name. */
export const UNNAMED = "Ride";

export function toRideRow(row: RowSource): RideRow {
  const ride: RideRow = {
    id: row.activityId,
    name: row.name ?? UNNAMED,
    day: wallClock(row.startedAt, row.timezone).slice(0, 10),
    distanceM: row.distanceM === null ? null : Math.round(row.distanceM),
    climbM: row.elevationM === null ? null : Math.round(row.elevationM),
  };
  if (row.description !== null) ride.description = row.description;
  return ride;
}

/**
 * Whether SQLite folds the query's case the way the browser does. Its
 * `lower()` folds ASCII only, so a query with any other letter can miss a name
 * that differs from it in case, and the browser has to finish the search.
 */
export function foldsLikeBrowser(query: string): boolean {
  return /^[ -~]*$/.test(query.trim());
}

/**
 * Whether the name or the description a row shows holds the query, in any
 * case. `instr` rather than `LIKE`, which D1 caps at fifty bytes of pattern,
 * shorter than some ride names a reader can search for in full.
 */
function rowHolds(query: string): Expression<SqlBool> {
  const needle = query.trim().toLowerCase();
  return sql<SqlBool>`(instr(lower(coalesce(name, ${UNNAMED})), ${needle}) > 0
    or instr(lower(coalesce(description, '')), ${needle}) > 0)`;
}

export interface RidesPage {
  /** The day of the latest ride, or null for an empty feed. */
  latestDay: string | null;
  highlights: RideTuple[];
  months: RideMonth[];
  logCursor: string | null;
  /** Records among the rides the query matches, or null without one. */
  matchRecords: Records<RideTuple> | null;
  /** The first `MATCH_COUNT` rides the query matches, or null without one. */
  matches: RideTuple[] | null;
  /** Whether more rides match than `matches` carries. */
  partial: boolean;
}

/** Everything `/rides` renders on first load, for the query it was asked with. */
export async function queryRidesPage(
  db: Kysely<Database>,
  query = "",
): Promise<RidesPage> {
  const searching = query.trim() !== "";
  const latest = await db
    .selectFrom("activityFeed")
    .select(["startedAt", "timezone"])
    .where("sport", "=", "ride")
    .orderBy("startedAt", "desc")
    .limit(1)
    .executeTakeFirst();
  if (latest === undefined) {
    return {
      latestDay: null,
      highlights: [],
      months: [],
      logCursor: null,
      matchRecords: searching ? { longest: [], climbing: [] } : null,
      matches: searching ? [] : null,
      partial: false,
    };
  }

  const latestDay = wallClock(latest.startedAt, latest.timezone).slice(0, 10);
  const [highlights, log, matchRecords, found] = await Promise.all([
    queryHighlights(db, latest.startedAt, latestDay),
    queryRideRowsPage(db, monthAfter(monthKeyOf(latestDay)), FIRST_MONTHS),
    searching ? queryMatchRecords(db, query) : null,
    searching ? queryMatches(db, query) : null,
  ]);

  return {
    latestDay,
    highlights: highlights.map((row) => toTuple(row)),
    months: log.months,
    logCursor: log.logCursor,
    matchRecords: matchRecords === null ? null : recordTuples(matchRecords),
    matches: found?.rows.map((row) => toTuple(row)) ?? null,
    // A query SQLite can't fold the way the browser does may have missed
    // names, so the browser confirms it against every ride.
    partial:
      (found?.partial ?? false) || (searching && !foldsLikeBrowser(query)),
  };
}

/** The Rides route's highlights on their own, for the home card. */
export async function queryRideHighlights(
  db: Kysely<Database>,
): Promise<RideRow[]> {
  const latest = await db
    .selectFrom("activityFeed")
    .select(["startedAt", "timezone"])
    .where("sport", "=", "ride")
    .orderBy("startedAt", "desc")
    .limit(1)
    .executeTakeFirst();
  if (latest === undefined) return [];
  const latestDay = wallClock(latest.startedAt, latest.timezone).slice(0, 10);
  return queryHighlights(db, latest.startedAt, latestDay);
}

function recordTuples(records: Records<RideRow>): Records<RideTuple> {
  return {
    longest: records.longest.map((row) => toTuple(row)),
    climbing: records.climbing.map((row) => toTuple(row)),
  };
}

/** The big rides from the `HIGHLIGHT_DAYS` before the latest one, biggest first. */
async function queryHighlights(
  db: Kysely<Database>,
  latestStartedAt: string,
  latestDay: string,
): Promise<RideRow[]> {
  const cutoff = new Date(
    Date.parse(`${latestDay}T00:00:00Z`) - HIGHLIGHT_DAYS * DAY_MS,
  )
    .toISOString()
    .slice(0, 10);
  // Two days of slack cover the zone offset between an instant and its day.
  const since = new Date(
    Date.parse(latestStartedAt) - (HIGHLIGHT_DAYS + 2) * DAY_MS,
  ).toISOString();
  const rows = await db
    .selectFrom("activityFeed")
    .select(ROW_COLUMNS)
    .where("sport", "=", "ride")
    .where("startedAt", ">=", since)
    .where((eb) =>
      eb.or([
        eb("distanceM", ">=", BIG.distanceM),
        eb("elevationM", ">=", BIG.climbM),
      ]),
    )
    .orderBy("startedAt", "desc")
    .execute();
  return rankHighlights(
    rows.map((row) => toRideRow(row)).filter((row) => row.day >= cutoff),
  );
}

/**
 * The months ending just before `before`, an exclusive month key: every ride
 * in them, commutes included, newest first, and the month the page after this
 * one loads before.
 */
export async function queryRideRowsPage(
  db: Kysely<Database>,
  before: string,
  count = RIDE_PAGE_MONTHS,
): Promise<RideRowsPage> {
  const start = monthsBefore(before, count);
  const startBound = lowerBound(start);
  const rows = await db
    .selectFrom("activityFeed")
    .select(ROW_COLUMNS)
    .where("sport", "=", "ride")
    .where("startedAt", ">=", startBound)
    .where("startedAt", "<", upperBound(before))
    .orderBy("startedAt", "desc")
    .execute();
  const all = rows.map((row) => toRideRow(row));
  const inWindow = all.filter((row) => {
    const key = monthKeyOf(row.day);
    return key >= start && key < before;
  });
  return {
    months: byMonth(inWindow),
    logCursor: await pageCursor(
      db,
      all.map((row) => monthKeyOf(row.day)),
      start,
      startBound,
    ),
  };
}

/** The longest rides and the ones that climbed most, of those the query matches. */
async function queryMatchRecords(
  db: Kysely<Database>,
  query: string,
): Promise<Records<RideRow>> {
  const top = async (column: "distanceM" | "elevationM") => {
    const rows = await db
      .selectFrom("activityFeed")
      .select(ROW_COLUMNS)
      .where("sport", "=", "ride")
      .where(column, ">", 0)
      // A manual entry logs a figure with no distance, like a year of commutes
      // as one climb, and isn't a ride to hold a record.
      .where("distanceM", ">", 0)
      .where(rowHolds(query))
      .orderBy(column, "desc")
      .orderBy("startedAt", "desc")
      .limit(RECORD_COUNT)
      .execute();
    return rows.map((row) => toRideRow(row));
  };
  const [longest, climbing] = await Promise.all([
    top("distanceM"),
    top("elevationM"),
  ]);
  return { longest, climbing };
}

/** The newest rides whose names hold the query, and whether there are more. */
async function queryMatches(
  db: Kysely<Database>,
  query: string,
): Promise<{ rows: RideRow[]; partial: boolean }> {
  const rows = await db
    .selectFrom("activityFeed")
    .select(ROW_COLUMNS)
    .where("sport", "=", "ride")
    .where(rowHolds(query))
    .orderBy("startedAt", "desc")
    .limit(MATCH_COUNT + 1)
    .execute();
  return {
    rows: rows.slice(0, MATCH_COUNT).map((row) => toRideRow(row)),
    partial: rows.length > MATCH_COUNT,
  };
}

/** Every ride, newest first: what the browser searches once a reader starts typing. */
export async function queryRideIndex(
  db: Kysely<Database>,
): Promise<RideTuple[]> {
  const rows = await db
    .selectFrom("activityFeed")
    .select(ROW_COLUMNS)
    .where("sport", "=", "ride")
    .orderBy("startedAt", "desc")
    .execute();
  return rows.map((row) => toTuple(toRideRow(row)));
}

const RECORD_COLUMNS = [
  "activityId",
  "name",
  "startedAt",
  "timezone",
  "distanceM",
  "elevationM",
  "movingS",
  "averageWatts",
  "powerSource",
] as const;

// A record counts toward the ride's local year, which SQLite can't work out
// from an instant and a zone name. Only a ride whose UTC date is December 31
// or January 1 can fall in another year locally, so those rides are read
// whole, and every other ride competes within its UTC year, which is also its
// local one. Each year's leaders and those edge rides hold every period's
// records, all time included, and `rankPeriods` settles the rest.
const UTC_YEAR = sql`substr(started_at, 1, 4)`;
const YEAR_EDGE = sql<number>`substr(started_at, 6, 5) in ('12-31', '01-01')`;

function rankInYear(column: "distanceM" | "elevationM" | "movingS") {
  return sql<number>`row_number() over (partition by ${UTC_YEAR}, ${YEAR_EDGE} order by ${sql.ref(column)} desc, started_at desc)`;
}

/**
 * Every period's records: all time, then each year newest first. Indoor rides
 * are left out, and so is a manual entry with no distance, which never went
 * anywhere.
 */
export async function queryRideRecords(
  db: Kysely<Database>,
): Promise<PeriodRecords[]> {
  const [rows, points] = await Promise.all([
    db
      .selectFrom((eb) =>
        eb
          .selectFrom("activityFeed")
          .select(RECORD_COLUMNS)
          .select([
            YEAR_EDGE.as("edge"),
            rankInYear("distanceM").as("byDistance"),
            rankInYear("elevationM").as("byClimb"),
            rankInYear("movingS").as("byMoving"),
          ])
          .where("sport", "=", "ride")
          .where("distanceM", ">", 0)
          .where((inner) =>
            inner.or([inner("indoor", "is", null), inner("indoor", "=", 0)]),
          )
          .as("ranked"),
      )
      .selectAll()
      .where((eb) =>
        eb.or([
          eb("edge", "=", 1),
          eb("byDistance", "<=", RECORD_ROWS),
          eb("byClimb", "<=", RECORD_ROWS),
          eb("byMoving", "<=", RECORD_ROWS),
        ]),
      )
      .execute(),
    // An estimated curve is Strava's guess at a rider without a meter, which
    // is no best at all.
    db
      .selectFrom((eb) =>
        eb
          .selectFrom("activityPowerCurve")
          .innerJoin(
            "activityFeed",
            "activityFeed.activityId",
            "activityPowerCurve.activityId",
          )
          .select([
            "activityPowerCurve.activityId",
            "activityPowerCurve.durationS",
            "activityPowerCurve.watts",
            "activityFeed.name",
            "activityFeed.startedAt",
            "activityFeed.timezone",
            YEAR_EDGE.as("edge"),
            sql<number>`row_number() over (partition by duration_s, ${UTC_YEAR}, ${YEAR_EDGE} order by watts desc, started_at desc)`.as(
              "rank",
            ),
          ])
          .where("activityFeed.sport", "=", "ride")
          .where("activityFeed.powerSource", "=", "measured")
          .where((inner) =>
            inner.or([
              inner("activityFeed.indoor", "is", null),
              inner("activityFeed.indoor", "=", 0),
            ]),
          )
          .where("activityPowerCurve.durationS", "in", LADDER_DURATIONS)
          .as("points"),
      )
      .selectAll()
      .where((eb) => eb.or([eb("edge", "=", 1), eb("rank", "=", 1)]))
      .execute(),
  ]);
  return rankPeriods(
    rows.map((row) => ({
      id: row.activityId,
      name: row.name ?? UNNAMED,
      day: wallClock(row.startedAt, row.timezone).slice(0, 10),
      distanceM: Math.round(row.distanceM ?? 0),
      climbM: row.elevationM === null ? null : Math.round(row.elevationM),
      movingS: row.movingS === null ? null : Math.round(row.movingS),
      watts:
        row.powerSource === "measured" && row.averageWatts !== null
          ? Math.round(row.averageWatts)
          : null,
    })),
    points.map((point) => ({
      id: point.activityId,
      name: point.name ?? UNNAMED,
      day: wallClock(point.startedAt, point.timezone).slice(0, 10),
      durationS: point.durationS,
      watts: Math.round(point.watts),
    })),
  );
}
