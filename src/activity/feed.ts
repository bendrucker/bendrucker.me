// The read side of the activity feed: rows the Publish entrypoint wrote,
// shaped into what the cycling page renders. The stories fill the same shape
// by hand in `src/components/cycling/fixtures.ts`.
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { sql, type Kysely, type Selectable } from "kysely";
import { z } from "zod";
import {
  formatMonthKey,
  metersToFeet,
  metersToMiles,
  monthKeyOf,
} from "@/components/cycling/format";
import { decodePolyline } from "@/components/cycling/geo";
import { normalizeProfile } from "@/components/cycling/profile";
import type { ActivityFeedTable, Database } from "@/db";
import type {
  CyclingActivityData,
  Highlight,
  HighlightMonth,
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

export interface PowerCurvePoint {
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

const POWER_NOTE = "from rides with a power meter";

const LONGEST: RideBadge = { kind: "longest", icon: "ruler", label: "longest" };
const MOST_CLIMBING: RideBadge = {
  kind: "most-climbing",
  icon: "trending-up",
  label: "most climbing",
};

const elevationProfile = z.array(z.number());
const photoKeys = z.array(z.string());

export async function queryCyclingActivity(
  db: Kysely<Database>,
  now: Date = new Date(),
): Promise<CyclingActivityData> {
  const [rows, curve] = await Promise.all([
    db
      .selectFrom("activityFeed")
      .selectAll()
      .where("sport", "=", "ride")
      .execute(),
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
        "activityPowerCurve.durationS",
        sql<number>`max(${sql.ref("activityPowerCurve.watts")})`.as("watts"),
      ])
      .groupBy("activityPowerCurve.durationS")
      .execute(),
  ]);
  return buildCyclingActivity(rows, curve, now);
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
  startedAtMs: number;
}

export function buildCyclingActivity(
  rows: readonly FeedRow[],
  curve: readonly PowerCurvePoint[],
  now: Date,
): CyclingActivityData {
  const entries = rows
    .map((row) => toEntry(row))
    .toSorted((a, b) => b.startedAtMs - a.startedAtMs);
  const months = groupMonths(entries);
  const bests = powerBests(entries, curve);

  const data: CyclingActivityData = {
    totals: yearTotals(entries, now),
    months: months.map((month) => month.group),
    highlightMonths: months.flatMap((month) => month.highlights),
    records: records(entries),
    powerBests: bests,
  };
  if (bests.length > 0) data.powerNote = POWER_NOTE;
  return data;
}

function toEntry(row: FeedRow): Entry {
  const startedAt = wallClock(row.startedAt, row.timezone);
  const measured = row.powerSource === "measured";
  const measuredWatts =
    measured && row.averageWatts !== null ? Math.round(row.averageWatts) : null;
  const route = row.polyline === null ? [] : decodePolyline(row.polyline);
  const profile =
    row.elevationProfile === null
      ? null
      : parseJson(elevationProfile, row.elevationProfile);

  const ride: Ride = {
    id: row.activityId,
    name: row.name ?? "Ride",
    startedAt,
    photos: photos(row),
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
  if (route.length >= 2) ride.route = route;
  if (profile !== null && profile.length > 0) {
    ride.elevationProfile = normalizeProfile(profile).map(
      (sample) => Math.round(sample * 1000) / 1000,
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
    startedAtMs: Date.parse(row.startedAt),
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

function photos(row: FeedRow): RidePhoto[] {
  const keys = parseJson(photoKeys, row.photoKeys) ?? [];
  return keys.map((key, index) => ({
    id: key,
    thumbnailUrl: `/photos/${key}`,
    fullUrl: `/photos/${key}`,
    alt: `Photo ${index + 1} from ${row.name ?? "the ride"}`,
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
    const highlights = highlightMonth(carded);
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
function highlightMonth(carded: readonly Entry[]): Highlight[] {
  if (carded.length < 2) return [];

  const longest = best(carded, (entry) => entry.ride.distanceMi);
  const hilliest = best(carded, (entry) => entry.ride.elevationFt);
  const highlights: Highlight[] = [];

  if (longest) {
    longest.ride.badges.push(LONGEST);
    highlights.push({ ride: longest.ride, badge: LONGEST, metric: "distance" });
  }
  if (hilliest) {
    hilliest.ride.badges.push(MOST_CLIMBING);
    if (hilliest !== longest) {
      highlights.push({
        ride: hilliest.ride,
        badge: MOST_CLIMBING,
        metric: "elevation",
      });
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

function records(entries: readonly Entry[]): RecordPeriod[] {
  if (entries.length === 0) return [];
  const years = [...new Set(entries.map((entry) => entry.year))];
  return [
    { period: "all", lists: rankedLists(entries) },
    ...years.map((year) => ({
      period: String(year),
      lists: rankedLists(entries.filter((entry) => entry.year === year)),
    })),
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
  const byDuration = new Map(
    curve.map((point) => [point.durationS, Math.round(point.watts)]),
  );
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
