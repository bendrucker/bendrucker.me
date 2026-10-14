// The read side of the activity feed: rows the Publish entrypoint wrote,
// shaped into what the cycling page renders. The stories fill the same shape
// by hand in `src/components/cycling/fixtures.ts`.
import { TZDate } from "@date-fns/tz";
import { format, subHours } from "date-fns";
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
import { readTimestamp, type ActivityFeedTable, type Database } from "@/db";
import { isVideoKey, photoUrl, thumbnailUrl } from "@/photos";
import {
  decodePolyline,
  encodeProfile,
  MAX_PROFILE_SAMPLES,
  thin,
  thinPolyline,
} from "./track";
import type {
  CommuteSummary,
  CyclingActivityData,
  Highlight,
  HighlightMonth,
  LogPage,
  MonthGroup,
  Ride,
  RideBadge,
  RideMedia,
  YearTotals,
} from "./types";

/**
 * A row as the feed reads it. Only a ride's own page shows its description and
 * the figures past distance, time, and average power, and only the Records
 * view reads the indoor flag.
 */
export type FeedRow = Omit<
  Selectable<ActivityFeedTable>,
  DetailColumn | "indoor"
>;

type DetailColumn =
  | "description"
  | "normalizedWatts"
  | "averageHeartRate"
  | "temperatureLowC"
  | "temperatureHighC";

/** Every column but the track: what the totals read. */
export type RideRow = Omit<
  FeedRow,
  "polyline" | "elevationProfile" | "photoKeys"
>;

/** The track columns, read only for the rides the page draws a card for. */
export type TrackRow = Pick<
  FeedRow,
  "activityId" | "polyline" | "elevationProfile" | "photoKeys"
>;

export interface FeedRows {
  rides: RideRow[];
  tracks: TrackRow[];
}

/**
 * Months the log renders on first load, counting back from the month of the
 * latest ride. The rest scroll in a page at a time.
 */
export const LOG_MONTHS = 3;

/** Months the highlights cover, counting back the same way. */
export const HIGHLIGHT_MONTHS = 12;

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

/** A ride under this length is a commute: counted in the month, not carded. */
const COMMUTE_MAX_DISTANCE_M = 10_000;

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
  // Tracks dominate a row's size, so the totals read every ride without them,
  // and only the rides with a card on the page pay for theirs. Which rides
  // those are is settled by laying the page out first.
  const rides = await db
    .selectFrom("activityFeed")
    .select(RIDE_COLUMNS)
    .where("sport", "=", "ride")
    .execute();
  const layout = layoutFeed(toEntries(rides));
  attachTracks(layout.entries, await queryTracks(db, layout));
  return assembleFeed(layout, now);
}

/**
 * The furthest apart two zones' clocks can be: a ride with a later wall
 * clock than another started no more than this long before it.
 */
const ZONE_SPREAD_HOURS = 26;

/**
 * The latest rides the feed would card, newest first by wall clock, with no
 * track, media, or badge attached: what a page that names a ride wants,
 * without the feed. Commutes stay out here as they do from the months.
 *
 * The rows are ordered by instant and the rides by wall clock, which agree
 * except across zones, so the query reads on past the limit by the widest
 * the zones can disagree before the rides are sorted and cut.
 */
export async function queryLatestRides(
  db: Kysely<Database>,
  limit: number,
): Promise<Ride[]> {
  const carded = () =>
    db
      .selectFrom("activityFeed")
      .select(RIDE_COLUMNS)
      .where("sport", "=", "ride")
      .where((eb) =>
        eb.or([
          eb("distanceM", "is", null),
          eb("distanceM", ">=", COMMUTE_MAX_DISTANCE_M),
        ]),
      );
  const byInstant = await carded()
    .orderBy("startedAt", "desc")
    .limit(limit)
    .execute();
  const last = byInstant.at(-1);
  const rows =
    byInstant.length < limit || last === undefined
      ? byInstant
      : await carded()
          .where(
            "startedAt",
            ">=",
            subHours(new Date(last.startedAt), ZONE_SPREAD_HOURS).toISOString(),
          )
          .execute();
  return toEntries(rows)
    .slice(0, limit)
    .map((entry) => entry.ride);
}

/**
 * A ride for its own page, with the metres its figures format from. A figure
 * the ride never recorded is null, and the page leaves its tile out.
 */
export interface RideDetail {
  ride: Ride;
  distanceM: number | null;
  elevationM: number | null;
  movingS: number | null;
  /** Power figures from a power meter only. An estimate reads as none. */
  averageWatts: number | null;
  normalizedWatts: number | null;
  averageHeartRate: number | null;
  temperatureLowC: number | null;
  temperatureHighC: number | null;
  /** What the rider wrote on the activity, shown as the page's dek. */
  description: string | null;
}

/**
 * One ride with its track and media, for its own page, or null where no ride
 * carries the id. A commute has a page like any other ride.
 */
export async function queryRideById(
  db: Kysely<Database>,
  id: string,
): Promise<RideDetail | null> {
  const row = await db
    .selectFrom("activityFeed")
    .select([
      ...LOG_COLUMNS,
      "description",
      "normalizedWatts",
      "averageHeartRate",
      "temperatureLowC",
      "temperatureHighC",
    ])
    .where("activityId", "=", id)
    .where("sport", "=", "ride")
    .executeTakeFirst();
  if (row === undefined) return null;
  const { ride } = toEntry(row);
  attachTrack(ride, row);
  const measured = row.powerSource === "measured";
  return {
    ride,
    distanceM: row.distanceM,
    elevationM: row.elevationM,
    movingS: row.movingS,
    averageWatts: measured ? row.averageWatts : null,
    normalizedWatts: measured ? row.normalizedWatts : null,
    averageHeartRate: row.averageHeartRate,
    temperatureLowC: row.temperatureLowC,
    temperatureHighC: row.temperatureHighC,
    description: row.description,
  };
}

/**
 * The tracks the page draws: every ride in the log's window, and the
 * highlighted rides from the months before it. The window is bounded on
 * instants with slack for the local dates it is keyed on, which reads a
 * few tracks the log then leaves out.
 */
async function queryTracks(
  db: Kysely<Database>,
  { firstKey, months }: Layout,
): Promise<TrackRow[]> {
  if (firstKey === null) return [];
  const since = lowerBound(firstKey);
  const highlighted = months
    .filter((month) => month.group.key < firstKey)
    .flatMap((month) => month.highlights)
    .flatMap((month) => month.highlights.map((entry) => entry.ride.id));
  return db
    .selectFrom("activityFeed")
    .select(TRACK_COLUMNS)
    .where("sport", "=", "ride")
    .where((eb) =>
      highlighted.length === 0
        ? eb("startedAt", ">=", since)
        : eb.or([
            eb("startedAt", ">=", since),
            eb("activityId", "in", highlighted),
          ]),
    )
    .execute();
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
  const entries = toEntries(rows);
  attachTracks(entries, rows);
  const inWindow = entries.filter(
    (entry) => entry.monthKey >= start && entry.monthKey < before,
  );

  return {
    // A month's badges and totals compare only the rides inside it. A page
    // needs no context from the pages around it.
    months: groupMonths(inWindow).map((month) => month.group),
    logCursor: await pageCursor(
      db,
      entries.map((entry) => entry.monthKey),
      start,
      startBound,
    ),
  };
}

/**
 * The month the page after this one loads before: the newest month older than
 * the window, so an off-season gap costs one round trip.
 */
export async function pageCursor(
  db: Kysely<Database>,
  monthKeys: readonly string[],
  start: string,
  startBound: string,
): Promise<string | null> {
  // The slack rows already reach a couple of days past the window, so one of
  // them falling under an older month names that month without another query.
  if (monthKeys.some((key) => key < start)) return start;

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
export function lowerBound(month: string): string {
  return new Date(monthInstant(month) - SLACK_MS).toISOString();
}

/** The latest instant a ride keyed before `month` could carry. */
export function upperBound(month: string): string {
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
export interface FeedVersion {
  /** A fingerprint an ETag can carry. */
  tag: string;
  /** The latest write, for `Last-Modified`. */
  updatedAt: Date | null;
}

export async function readFeedVersion(
  db: Kysely<Database>,
): Promise<FeedVersion> {
  const { count, updatedAt } = await db
    .selectFrom("activityFeed")
    .select([
      sql<number>`count(*)`.as("count"),
      sql<string | null>`max(${sql.ref("updatedAt")})`.as("updatedAt"),
    ])
    .executeTakeFirstOrThrow();
  const changed = (updatedAt ?? "0").replaceAll(/[^\x21\x23-\x7e]/g, "");
  return { tag: `${count}.${changed}`, updatedAt: readTimestamp(updatedAt) };
}

interface Entry {
  ride: Ride;
  year: number;
  monthKey: string;
  commute: boolean;
  distanceM: number;
  elevationM: number;
}

export function buildCyclingActivity(
  rows: FeedRows,
  now: Date,
): CyclingActivityData {
  const layout = layoutFeed(toEntries(rows.rides));
  attachTracks(layout.entries, rows.tracks);
  return assembleFeed(layout, now);
}

interface Layout {
  /** Every ride, newest first. */
  entries: Entry[];
  /** The first month the log renders, or null with no rides at all. */
  firstKey: string | null;
  /** The highlight window's months, which the log's are the newest of. */
  months: Month[];
}

/**
 * Both windows count back from the latest ride's month, by the local month
 * each ride is filed under. Entries arrive newest first, so the first one
 * sets them.
 */
function layoutFeed(entries: Entry[]): Layout {
  const latest = entries[0];
  if (latest === undefined) return { entries, firstKey: null, months: [] };
  const firstKey = monthsBefore(latest.monthKey, LOG_MONTHS - 1);
  const highlightKey = monthsBefore(latest.monthKey, HIGHLIGHT_MONTHS - 1);
  const months = groupMonths(
    entries.filter((entry) => entry.monthKey >= highlightKey),
  );
  return { entries, firstKey, months };
}

function assembleFeed(
  { entries, firstKey, months }: Layout,
  now: Date,
): CyclingActivityData {
  const logged =
    firstKey === null
      ? []
      : months.filter((month) => month.group.key >= firstKey);
  return {
    totals: yearTotals(entries, now),
    months: logged.map((month) => month.group),
    highlightMonths: months.flatMap((month) => month.highlights),
    logCursor: initialCursor(entries, firstKey),
  };
}

/**
 * Ordered on the wall clock the months are keyed on, so a ride sits in the log
 * by its own date. The instant can fall on the other side of a month or year
 * boundary in another zone.
 */
function toEntries(rides: readonly RideRow[]): Entry[] {
  return rides
    .map((row) => toEntry(row))
    .toSorted((a, b) => b.ride.startedAt.localeCompare(a.ride.startedAt));
}

/**
 * The months group the same `Ride` objects the entries hold, so a track
 * attached after the layout reaches every view that shows the ride.
 */
function attachTracks(
  entries: readonly Entry[],
  tracks: readonly TrackRow[],
): void {
  const byId = new Map(tracks.map((track) => [track.activityId, track]));
  for (const entry of entries) {
    const track = byId.get(entry.ride.id);
    if (track !== undefined) attachTrack(entry.ride, track);
  }
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

function toEntry(row: RideRow): Entry {
  const startedAt = wallClock(row.startedAt, row.timezone);
  const measured = row.powerSource === "measured";
  const measuredWatts =
    measured && row.averageWatts !== null ? Math.round(row.averageWatts) : null;

  const ride: Ride = {
    id: row.activityId,
    name: row.name ?? "Ride",
    startedAt,
    media: [],
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

  return {
    ride,
    year: Number(startedAt.slice(0, 4)),
    monthKey: monthKeyOf(startedAt),
    commute: row.distanceM !== null && row.distanceM < COMMUTE_MAX_DISTANCE_M,
    distanceM: row.distanceM ?? 0,
    elevationM: row.elevationM ?? 0,
  };
}

/**
 * The ride's own wall clock, which is what a reader means by "when". A
 * timezone the runtime does not know falls back to UTC rather than dropping
 * the ride, and a timestamp that never parsed passes through for the date
 * formatter to show as-is. `TZDate` accepts any zone name and yields an
 * invalid date for one it cannot resolve, so the check is on the result.
 */
export function wallClock(startedAt: string, timezone: string): string {
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

function attachTrack(ride: Ride, track: TrackRow): void {
  ride.media = media(track, ride.name);

  const route = track.polyline === null ? [] : decodePolyline(track.polyline);
  // The map endpoint reads the stored polyline back through this same helper,
  // so the basemap it renders is framed on the points the card draws.
  if (track.polyline !== null && route.length >= 2) {
    ride.route = thinPolyline(track.polyline);
  }

  const profile =
    track.elevationProfile === null
      ? null
      : parseJson(elevationProfile, track.elevationProfile);
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
}

function media(track: TrackRow, name: string): RideMedia[] {
  const keys = parseJson(photoKeys, track.photoKeys) ?? [];
  return keys.map((key, index) => {
    const kind = isVideoKey(key) ? "video" : "photo";
    return {
      id: key,
      kind,
      thumbnailUrl: thumbnailUrl(key),
      fullUrl: photoUrl(key),
      alt: `${kind === "video" ? "Video" : "Photo"} ${index + 1} from ${name}`,
    };
  });
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
    const commutes = members.filter((entry) => entry.commute);
    const highlights = highlightMonth(carded, formatMonthShort(key));
    const stats = {
      key,
      label: formatMonthKey(key),
      distanceMi: miles(sum(members, (entry) => entry.distanceM)),
      elevationFt: feet(sum(members, (entry) => entry.elevationM)),
      rideCount: members.length,
    };
    const group: MonthGroup = {
      ...stats,
      rides: carded.map((entry) => entry.ride),
    };
    if (commutes.length > 0) group.commutes = summarizeCommutes(commutes);
    return {
      group,
      highlights: highlights.length > 0 ? [{ ...stats, highlights }] : [],
    };
  });
}

function summarizeCommutes(entries: readonly Entry[]): CommuteSummary {
  return {
    count: entries.length,
    distanceMi: miles(sum(entries, (entry) => entry.distanceM)),
    movingSeconds: sum(entries, (entry) => entry.ride.movingSeconds ?? 0),
  };
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
 * numbers up until the first ride of the new one replaces them. The summary
 * names the year, so a count covering only part of the log needs no qualifier.
 */
function yearTotals(entries: readonly Entry[], now: Date): YearTotals {
  const year = entries[0]?.year ?? now.getUTCFullYear();
  const inYear = entries.filter((entry) => entry.year === year);
  return {
    year,
    distanceMi: miles(sum(inYear, (entry) => entry.distanceM)),
    elevationFt: feet(sum(inYear, (entry) => entry.elevationM)),
    rideCount: inYear.length,
  };
}

function sum(
  entries: readonly Entry[],
  measure: (entry: Entry) => number,
): number {
  return entries.reduce((total, entry) => total + measure(entry), 0);
}
