// The read side of the activity feed: rows the Publish entrypoint wrote,
// shaped into what the cycling page renders. The stories fill the same shape
// by hand in `src/components/cycling/fixtures.ts`.
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { sql, type Kysely, type Selectable } from "kysely";
import { z } from "zod";
import {
  formatMonthKey,
  formatMonthShort,
  metersToFeet,
  metersToMiles,
  monthAfter,
  monthKeyOf,
  monthsBefore,
} from "@/components/cycling/format";
import {
  longestClimb,
  normalizeProfile,
  relief,
} from "@/components/cycling/profile";
import type { ActivityFeedTable, Database } from "@/db";
import {
  decodePolyline,
  encodePolyline,
  encodeProfile,
  MAX_PROFILE_SAMPLES,
  MAX_ROUTE_POINTS,
  thin,
} from "./track";
import type {
  CyclingActivityData,
  Highlight,
  HighlightMonth,
  LogPage,
  MonthGroup,
  PowerBest,
  RankedList,
  RankedRow,
  RecordPeriod,
  Ride,
  RideBadge,
  RidePhoto,
  YearTotals,
} from "./types";

export type FeedRow = Selectable<ActivityFeedTable>;

/** Every column but the track: what the totals and ranked lists read. */
export type RideRow = Omit<
  FeedRow,
  "polyline" | "elevationProfile" | "photoKeys"
>;

/** The track columns, read only for the rides the log shows. */
export type TrackRow = Pick<
  FeedRow,
  "activityId" | "polyline" | "elevationProfile" | "photoKeys"
>;

export interface FeedRows {
  rides: RideRow[];
  tracks: TrackRow[];
}

/** Months the log shows, counting back from the month of the latest ride. */
export const LOG_MONTHS = 12;

/** Months an older log page carries. */
export const PAGE_MONTHS = 6;

/**
 * A month is keyed on the ride's local wall clock while `startedAt` is a UTC
 * instant, so a ride within a day of a month boundary can file under the
 * neighbouring month. Every query bounded on instants widens by this much and
 * filters the rows it gets back by month key.
 */
const SLACK_MS = 2 * 24 * 3600 * 1000;

const RIDE_COLUMNS = [
  "activityId",
  "stravaId",
  "name",
  "sport",
  "startedAt",
  "timezone",
  "distanceM",
  "movingS",
  "elevationM",
  "averageWatts",
  "powerSource",
  "updatedAt",
] as const;

const TRACK_COLUMNS = [
  "activityId",
  "polyline",
  "elevationProfile",
  "photoKeys",
] as const;

/** Everything a log page reads: its rides carry their tracks from one query. */
const LOG_COLUMNS = [
  ...RIDE_COLUMNS,
  "polyline",
  "elevationProfile",
  "photoKeys",
] as const;

export interface PowerCurvePoint {
  activityId: string;
  durationS: number;
  watts: number;
}

/** A ride under this length is a commute: counted in the month, not carded. */
const COMMUTE_MAX_DISTANCE_M = 10_000;

const RANKED_ROWS = 5;

const POWER_LADDER = [
  { id: "1m", label: "1 min", durationS: 60 },
  { id: "5m", label: "5 min", durationS: 300 },
  { id: "20m", label: "20 min", durationS: 1200 },
  { id: "1h", label: "1 hr", durationS: 3600 },
] as const;

// Scoped per month where they are awarded, so the badge can say which month it
// won rather than leaving "longest" to read as all time.
const LONGEST = { kind: "longest", icon: "ruler", label: "longest" } as const;
const MOST_CLIMBING = {
  kind: "most-climbing",
  icon: "trending-up",
  label: "most climbing",
} as const;

const elevationProfile = z.array(z.number());
const photoKeys = z.array(z.string());

export async function queryCyclingActivity(
  db: Kysely<Database>,
  now: Date = new Date(),
): Promise<CyclingActivityData> {
  // Tracks dominate a row's size, so the ranked lists and totals read every
  // ride without them, and only the log's window pays for its tracks.
  const [rides, curve] = await Promise.all([
    db
      .selectFrom("activityFeed")
      .select(RIDE_COLUMNS)
      .where("sport", "=", "ride")
      .execute(),
    // Every measured ride's points, rather than one aggregate ladder: the
    // year a point counts toward is the ride's local one, which only the
    // entries know.
    db
      .selectFrom("activityPowerCurve")
      .innerJoin(
        "activityFeed",
        "activityFeed.activityId",
        "activityPowerCurve.activityId",
      )
      .where("activityFeed.sport", "=", "ride")
      .where("activityFeed.powerSource", "=", "measured")
      .select([
        "activityPowerCurve.activityId",
        "activityPowerCurve.durationS",
        "activityPowerCurve.watts",
      ])
      .execute(),
  ]);
  const cutoff = trackCutoff(rides);
  const tracks =
    cutoff === null
      ? []
      : await db
          .selectFrom("activityFeed")
          .select(TRACK_COLUMNS)
          .where("sport", "=", "ride")
          .where("startedAt", ">=", cutoff)
          .execute();
  return buildCyclingActivity({ rides, tracks }, curve, now);
}

/**
 * The instant before which no ride can fall in the log's window, from the
 * latest ride's month back `LOG_MONTHS`, with slack for the local dates the
 * window is actually keyed on.
 */
function trackCutoff(rides: readonly RideRow[]): string | null {
  let latest = -Infinity;
  for (const ride of rides) {
    const instant = Date.parse(ride.startedAt);
    if (instant > latest) latest = instant;
  }
  if (!Number.isFinite(latest)) return null;
  const month = new Date(latest).toISOString().slice(0, 7);
  return lowerBound(monthsBefore(month, LOG_MONTHS - 1));
}

/**
 * The `PAGE_MONTHS` calendar months ending just before `before`, an exclusive
 * month key. Both ends are bounded, so the page costs the same however far
 * back the reader has scrolled: one windowed read of the rides with their
 * tracks, and at most one probe for the month the next page starts on.
 */
export async function queryCyclingLogPage(
  db: Kysely<Database>,
  before: string,
): Promise<LogPage> {
  const start = monthsBefore(before, PAGE_MONTHS);
  const startBound = lowerBound(start);
  const rows = await db
    .selectFrom("activityFeed")
    .select(LOG_COLUMNS)
    .where("sport", "=", "ride")
    .where("startedAt", ">=", startBound)
    .where("startedAt", "<", upperBound(before))
    .execute();

  // A full row answers for both halves of `FeedRows`, so a page builds its
  // entries through the same path the whole feed does.
  const entries = toEntries({ rides: rows, tracks: rows });
  const inWindow = entries.filter(
    (entry) => entry.monthKey >= start && entry.monthKey < before,
  );

  return {
    // A month's badges and totals compare only the rides inside it. A page
    // needs no context from the pages around it.
    months: groupMonths(inWindow).map((month) => month.group),
    logCursor: await pageCursor(db, entries, start, startBound),
  };
}

/**
 * The month the page after this one loads before: the newest month older than
 * the window, so an off-season gap costs one round trip.
 */
async function pageCursor(
  db: Kysely<Database>,
  entries: readonly Entry[],
  start: string,
  startBound: string,
): Promise<string | null> {
  // The slack rows already reach a couple of days past the window, so one of
  // them falling under an older month names that month without another query.
  if (entries.some((entry) => entry.monthKey < start)) return start;

  const older = await db
    .selectFrom("activityFeed")
    .select(["startedAt", "timezone"])
    .where("sport", "=", "ride")
    .where("startedAt", "<", startBound)
    .orderBy("startedAt", "desc")
    .limit(1)
    .executeTakeFirst();
  if (older === undefined) return null;

  // The probe starts a clear two days below the window, further than any zone
  // can shift a local date, so this month is always below it too.
  return monthAfter(monthKeyOf(wallClock(older.startedAt, older.timezone)));
}

/** The earliest instant a ride keyed to `month` or later could carry. */
function lowerBound(month: string): string {
  return new Date(monthInstant(month) - SLACK_MS).toISOString();
}

/** The latest instant a ride keyed before `month` could carry. */
function upperBound(month: string): string {
  return new Date(monthInstant(month) + SLACK_MS).toISOString();
}

function monthInstant(month: string): number {
  return Date.parse(`${month}-01T00:00:00.000Z`);
}

/**
 * Row count and latest write together identify the feed's contents: every
 * write moves `updatedAt`, and a delete moves the count. Characters an ETag
 * cannot carry are dropped, which keeps a default-valued `updated_at` legal.
 */
export async function readFeedVersion(db: Kysely<Database>): Promise<string> {
  const { count, updatedAt } = await db
    .selectFrom("activityFeed")
    .select([
      sql<number>`count(*)`.as("count"),
      sql<string | null>`max(${sql.ref("updatedAt")})`.as("updatedAt"),
    ])
    .executeTakeFirstOrThrow();
  const changed = (updatedAt ?? "0").replaceAll(/[^\x21\x23-\x7e]/g, "");
  return `${count}.${changed}`;
}

interface Entry {
  ride: Ride;
  year: number;
  monthKey: string;
  commute: boolean;
  distanceM: number;
  elevationM: number;
  measuredWatts: number | null;
}

export function buildCyclingActivity(
  rows: FeedRows,
  curve: readonly PowerCurvePoint[],
  now: Date,
): CyclingActivityData {
  const entries = toEntries(rows);
  const firstKey = logWindow(entries);
  const months = groupMonths(
    firstKey === null
      ? []
      : entries.filter((entry) => entry.monthKey >= firstKey),
  );

  return {
    totals: yearTotals(entries, now),
    months: months.map((month) => month.group),
    highlightMonths: months.flatMap((month) => month.highlights),
    records: records(entries, curve),
    logCursor: initialCursor(entries, firstKey),
  };
}

/**
 * Ordered on the wall clock the months are keyed on, so a ride sits in the log
 * by its own date. The instant can fall on the other side of a month or year
 * boundary in another zone.
 */
function toEntries({ rides, tracks }: FeedRows): Entry[] {
  const trackById = new Map(tracks.map((track) => [track.activityId, track]));
  return rides
    .map((row) => toEntry(row, trackById.get(row.activityId)))
    .toSorted((a, b) => b.ride.startedAt.localeCompare(a.ride.startedAt));
}

/**
 * The first month of the log's window: the latest ride's month and the
 * `LOG_MONTHS - 1` before it, by the local month each ride is filed under.
 * Entries arrive newest first, so the first one sets the window.
 */
function logWindow(entries: readonly Entry[]): string | null {
  const latest = entries[0];
  if (latest === undefined) return null;
  return monthsBefore(latest.monthKey, LOG_MONTHS - 1);
}

/**
 * Every ride is already in hand here, so the first page boundary is exact: the
 * newest month below the window, which skips an off-season straight to the
 * next month that has rides in it.
 */
function initialCursor(
  entries: readonly Entry[],
  firstKey: string | null,
): string | null {
  if (firstKey === null) return null;
  const older = entries.find((entry) => entry.monthKey < firstKey);
  return older === undefined ? null : monthAfter(older.monthKey);
}

function toEntry(row: RideRow, track: TrackRow | undefined): Entry {
  const startedAt = wallClock(row.startedAt, row.timezone);
  const measured = row.powerSource === "measured";
  const measuredWatts =
    measured && row.averageWatts !== null ? Math.round(row.averageWatts) : null;
  const polyline = track?.polyline ?? null;
  const route = polyline === null ? [] : decodePolyline(polyline);
  const profile =
    track?.elevationProfile == null
      ? null
      : parseJson(elevationProfile, track.elevationProfile);

  const ride: Ride = {
    id: row.activityId,
    name: row.name ?? "Ride",
    startedAt,
    photos: track === undefined ? [] : photos(track, row.name),
    badges: [],
    facts: [],
  };
  if (row.stravaId !== null) {
    ride.stravaUrl = `https://www.strava.com/activities/${row.stravaId}`;
  }
  if (row.distanceM !== null) ride.distanceMi = miles(row.distanceM);
  if (row.elevationM !== null) ride.elevationFt = feet(row.elevationM);
  if (row.movingS !== null) ride.movingSeconds = Math.round(row.movingS);
  if (measuredWatts !== null) ride.averageWatts = measuredWatts;
  if (polyline !== null && route.length >= 2) {
    // The write side thins as it stores, so a row published since then is
    // already within the cap and its string goes out as it came in. Only a row
    // published before that pays to be bounded and re-encoded here.
    ride.route =
      route.length <= MAX_ROUTE_POINTS
        ? polyline
        : encodePolyline(thin(route, MAX_ROUTE_POINTS));
  }
  if (profile !== null && profile.length > 0) {
    // The profile arrives in metres, the same unit as the total the card
    // prints, so the longest climb converts the same way.
    const height = relief(
      ride.elevationFt,
      metersToFeet(longestClimb(profile)),
    );
    ride.elevationProfile = encodeProfile(
      thin(normalizeProfile(profile, height), MAX_PROFILE_SAMPLES),
    );
  }

  return {
    ride,
    year: Number(startedAt.slice(0, 4)),
    monthKey: monthKeyOf(startedAt),
    commute: row.distanceM !== null && row.distanceM < COMMUTE_MAX_DISTANCE_M,
    distanceM: row.distanceM ?? 0,
    elevationM: row.elevationM ?? 0,
    measuredWatts,
  };
}

/**
 * The ride's own wall clock, which is what a reader means by "when". A
 * timezone the runtime does not know falls back to UTC rather than dropping
 * the ride, and a timestamp that never parsed passes through for the date
 * formatter to show as-is. `TZDate` accepts any zone name and yields an
 * invalid date for one it cannot resolve, so the check is on the result.
 */
function wallClock(startedAt: string, timezone: string): string {
  const instant = new Date(startedAt);
  if (Number.isNaN(instant.getTime())) return startedAt;
  const zoned = new TZDate(instant, timezone);
  const local = Number.isNaN(zoned.getTime())
    ? new TZDate(instant, "UTC")
    : zoned;
  return format(local, "yyyy-MM-dd'T'HH:mm:ss");
}

function parseJson<T>(schema: z.ZodType<T>, text: string): T | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}

function photos(track: TrackRow, name: string | null): RidePhoto[] {
  const keys = parseJson(photoKeys, track.photoKeys) ?? [];
  return keys.map((key, index) => ({
    id: key,
    thumbnailUrl: `/photos/${key}`,
    fullUrl: `/photos/${key}`,
    alt: `Photo ${index + 1} from ${name ?? "the ride"}`,
  }));
}

function miles(meters: number): number {
  return Math.round(metersToMiles(meters) * 100) / 100;
}

function feet(meters: number): number {
  return Math.round(metersToFeet(meters));
}

interface Month {
  group: MonthGroup;
  highlights: HighlightMonth[];
}

function groupMonths(entries: readonly Entry[]): Month[] {
  const byKey = new Map<string, Entry[]>();
  for (const entry of entries) {
    const month = byKey.get(entry.monthKey);
    if (month) month.push(entry);
    else byKey.set(entry.monthKey, [entry]);
  }

  return [...byKey.entries()].map(([key, members]) => {
    const carded = members.filter((entry) => !entry.commute);
    const highlights = highlightMonth(carded, formatMonthShort(key));
    const stats = {
      key,
      label: formatMonthKey(key),
      distanceMi: miles(sum(members, (entry) => entry.distanceM)),
      elevationFt: feet(sum(members, (entry) => entry.elevationM)),
      rideCount: members.length,
    };
    return {
      group: {
        ...stats,
        rides: carded.map((entry) => entry.ride),
        commuteCount: members.length - carded.length,
      },
      highlights: highlights.length > 0 ? [{ ...stats, highlights }] : [],
    };
  });
}

/**
 * A month's longest and hilliest rides, badged on their cards and pulled out
 * as its highlights. A month with one ride has nothing to compare it to, so
 * it earns neither. Where one ride is both, it is highlighted once, for its
 * length.
 */
function highlightMonth(carded: readonly Entry[], scope: string): Highlight[] {
  if (carded.length < 2) return [];

  const longest = best(carded, (entry) => entry.ride.distanceMi);
  const hilliest = best(carded, (entry) => entry.ride.elevationFt);
  const highlights: Highlight[] = [];

  if (longest) {
    const badge: RideBadge = { ...LONGEST, scope };
    longest.ride.badges.push(badge);
    highlights.push({ ride: longest.ride, badge, metric: "distance" });
  }
  if (hilliest) {
    const badge: RideBadge = { ...MOST_CLIMBING, scope };
    hilliest.ride.badges.push(badge);
    if (hilliest !== longest) {
      highlights.push({ ride: hilliest.ride, badge, metric: "elevation" });
    }
  }
  return highlights;
}

function best(
  entries: readonly Entry[],
  measure: (entry: Entry) => number | undefined,
): Entry | undefined {
  let winner: Entry | undefined;
  let top = 0;
  for (const entry of entries) {
    const value = measure(entry);
    if (value !== undefined && value > top) {
      winner = entry;
      top = value;
    }
  }
  return winner;
}

/**
 * The most recent year with a ride, so a January page keeps last season's
 * numbers up until the first ride of the new one replaces them. The note
 * qualifies the count once the log below runs into another year.
 */
function yearTotals(entries: readonly Entry[], now: Date): YearTotals {
  const year = entries[0]?.year ?? now.getUTCFullYear();
  const inYear = entries.filter((entry) => entry.year === year);
  const totals: YearTotals = {
    year,
    distanceMi: miles(sum(inYear, (entry) => entry.distanceM)),
    elevationFt: feet(sum(inYear, (entry) => entry.elevationM)),
    rideCount: inYear.length,
  };
  if (inYear.length !== entries.length) {
    totals.note = `${inYear.length === 1 ? "ride" : "rides"} in ${year}`;
  }
  return totals;
}

function records(
  entries: readonly Entry[],
  curve: readonly PowerCurvePoint[],
): RecordPeriod[] {
  if (entries.length === 0) return [];
  const years = [...new Set(entries.map((entry) => entry.year))];
  const period = (name: string, within: readonly Entry[]): RecordPeriod => ({
    period: name,
    lists: rankedLists(within),
    powerBests: powerBests(within, curve),
  });
  return [
    period("all", entries),
    ...years.map((year) =>
      period(
        String(year),
        entries.filter((entry) => entry.year === year),
      ),
    ),
  ];
}

function rankedLists(entries: readonly Entry[]): RankedList[] {
  const lists: RankedList[] = [
    {
      id: "distance",
      icon: "ruler",
      title: "longest rides",
      metric: "distance",
      rows: ranked(entries, (entry) => entry.ride.distanceMi),
    },
    {
      id: "elevation",
      icon: "trending-up",
      title: "most climbing",
      metric: "elevation",
      rows: ranked(entries, (entry) => entry.ride.elevationFt),
    },
    {
      id: "duration",
      icon: "clock",
      title: "longest days",
      metric: "duration",
      rows: ranked(
        entries,
        (entry) => entry.ride.movingSeconds,
        (entry) =>
          entry.measuredWatts === null ? "" : ` · ${entry.measuredWatts} W`,
      ),
    },
  ];
  return lists.filter((list) => list.rows.length > 0);
}

function ranked(
  entries: readonly Entry[],
  measure: (entry: Entry) => number | undefined,
  extra: (entry: Entry) => string = () => "",
): RankedRow[] {
  return entries
    .flatMap((entry) => {
      const value = measure(entry);
      return value === undefined ? [] : [{ entry, value }];
    })
    .toSorted((a, b) => b.value - a.value)
    .slice(0, RANKED_ROWS)
    .map(({ entry, value }) => {
      const row: RankedRow = {
        id: entry.ride.id,
        name: entry.ride.name,
        detail: `'${String(entry.year).slice(2)}${extra(entry)}`,
        value,
      };
      if (entry.ride.stravaUrl) row.href = entry.ride.stravaUrl;
      return row;
    });
}

/**
 * Measured rides only: an estimated curve is Strava's guess at a rider
 * without a meter, not a best.
 */
function powerBests(
  entries: readonly Entry[],
  curve: readonly PowerCurvePoint[],
): PowerBest[] {
  const rides = new Set(entries.map((entry) => entry.ride.id));
  const byDuration = new Map<number, number>();
  for (const point of curve) {
    if (!rides.has(point.activityId)) continue;
    const watts = Math.round(point.watts);
    const standing = byDuration.get(point.durationS);
    if (standing === undefined || watts > standing) {
      byDuration.set(point.durationS, watts);
    }
  }
  const rideAverage = best(
    entries,
    (entry) => entry.measuredWatts ?? undefined,
  );
  if (byDuration.size === 0 && rideAverage === undefined) return [];

  return [
    ...POWER_LADDER.map(({ id, label, durationS }) => ({
      id,
      label,
      watts: byDuration.get(durationS) ?? null,
    })),
    {
      id: "ride",
      label: "ride avg",
      watts: rideAverage?.measuredWatts ?? null,
    },
  ];
}

function sum(
  entries: readonly Entry[],
  measure: (entry: Entry) => number,
): number {
  return entries.reduce((total, entry) => total + measure(entry), 0);
}
