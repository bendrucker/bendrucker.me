// The Rides route's reads. Every list on the route is a row of five values, so
// each query selects only the columns a row needs and leaves the track, the
// profile, and the photos to the ride's own page. The one exception is the
// Routes view, which reads the polylines of the two dozen tiles it draws.
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
  byMonth,
  toRouteTuple,
  toTuple,
  type RideMonth,
  type RideRow,
  type RideRowsPage,
  type RideTuple,
  type RouteTuple,
} from "./rows";
import { routeTilePath } from "./tile";

const ROW_COLUMNS = [
  "activityId",
  "name",
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

/** Tiles the Routes view draws, as many as the board does. */
export const ROUTE_COUNT = 12;

/** Search results the page renders before the reader scrolls for more. */
export const MATCH_COUNT = 60;

/**
 * The names Strava gives a ride nobody named. A route tile is labelled by its
 * name, so a grid of these would be a grid of times of day.
 */
export const DEFAULT_NAMES = [
  "Morning Ride",
  "Lunch Ride",
  "Afternoon Ride",
  "Evening Ride",
  "Night Ride",
] as const;

const DAY_MS = 24 * 3600 * 1000;

interface RowSource {
  activityId: string;
  name: string | null;
  startedAt: string;
  timezone: string;
  distanceM: number | null;
  elevationM: number | null;
}

export function toRideRow(row: RowSource): RideRow {
  return {
    id: row.activityId,
    name: row.name ?? "Ride",
    day: wallClock(row.startedAt, row.timezone).slice(0, 10),
    distanceM: Math.round(row.distanceM ?? 0),
    climbM: Math.round(row.elevationM ?? 0),
  };
}

/**
 * The query as a `LIKE` pattern. SQLite's `LIKE` folds ASCII case, which is
 * the same match `matches` makes in the browser for every name in the feed.
 */
export function likePattern(query: string): string {
  return `%${query.trim().replaceAll(/[\\%_]/g, String.raw`\$&`)}%`;
}

function nameLike(query: string): Expression<SqlBool> {
  return sql<SqlBool>`name like ${likePattern(query)} escape '\\'`;
}

export interface RidesPage {
  /** The day of the latest ride, or null for an empty feed. */
  latestDay: string | null;
  highlights: RideTuple[];
  months: RideMonth[];
  logCursor: string | null;
  /** All-time records, which a cleared search returns to. */
  records: Records<RideTuple>;
  /** Records among the rides the query matches, or null without one. */
  matchRecords: Records<RideTuple> | null;
  /**
   * The most recently ridden named routes. A search filters these in place
   * rather than reaching further back, so clearing it restores the same grid.
   */
  routes: RouteTuple[];
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
      records: { longest: [], climbing: [] },
      matchRecords: searching ? { longest: [], climbing: [] } : null,
      routes: [],
      matches: searching ? [] : null,
      partial: false,
    };
  }

  const latestDay = wallClock(latest.startedAt, latest.timezone).slice(0, 10);
  const [highlights, log, records, matchRecords, routes, found] =
    await Promise.all([
      queryHighlights(db, latest.startedAt, latestDay),
      queryRideRowsPage(db, monthAfter(monthKeyOf(latestDay)), FIRST_MONTHS),
      queryRecords(db, ""),
      searching ? queryRecords(db, query) : null,
      queryRoutes(db),
      searching ? queryMatches(db, query) : null,
    ]);

  return {
    latestDay,
    highlights: highlights.map((row) => toTuple(row)),
    months: log.months,
    logCursor: log.logCursor,
    records: recordTuples(records),
    matchRecords: matchRecords === null ? null : recordTuples(matchRecords),
    routes,
    matches: found?.rows.map((row) => toTuple(row)) ?? null,
    partial: found?.partial ?? false,
  };
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
async function queryRecords(
  db: Kysely<Database>,
  query: string,
): Promise<Records<RideRow>> {
  const top = async (column: "distanceM" | "elevationM") => {
    let select = db
      .selectFrom("activityFeed")
      .select(ROW_COLUMNS)
      .where("sport", "=", "ride")
      .where(column, ">", 0);
    if (query !== "") select = select.where(nameLike(query));
    const rows = await select
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

/**
 * The newest big ride under each of the `ROUTE_COUNT` most recently ridden
 * names, with its track drawn into a tile. A named route ridden a hundred times
 * is one tile, and a ride Strava named for the time of day is none. The big-ride
 * rule the highlights use keeps the everyday loops out, so the grid reads as
 * the routes worth riding rather than the commute.
 */
async function queryRoutes(db: Kysely<Database>): Promise<RouteTuple[]> {
  const rows = await db
    .selectFrom("activityFeed")
    .select([...ROW_COLUMNS, "polyline"])
    // SQLite fills the bare columns of an aggregate query from the row that
    // `max()` picked, which is what makes this the newest ride per name.
    .select(sql<string>`max(started_at)`.as("latest"))
    .where("sport", "=", "ride")
    .where("polyline", "is not", null)
    .where("name", "is not", null)
    .where("name", "not in", DEFAULT_NAMES)
    .where((eb) =>
      eb.or([
        eb("distanceM", ">=", BIG.distanceM),
        eb("elevationM", ">=", BIG.climbM),
      ]),
    )
    .groupBy("name")
    .orderBy("latest", "desc")
    .limit(ROUTE_COUNT)
    .execute();

  const tiles: RouteTuple[] = [];
  for (const row of rows) {
    const path = row.polyline === null ? null : routeTilePath(row.polyline);
    if (path !== null) tiles.push(toRouteTuple({ ...toRideRow(row), path }));
  }
  return tiles;
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
    .where(nameLike(query))
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
