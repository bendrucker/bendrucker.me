// The Records view: for all time and for each year, the best power held over a
// ladder of durations and the rides that went furthest, climbed most, and
// moved longest. Only outdoor rides count, and only a power meter's figures.
//
// The page renders one period and the island fetches the others as the reader
// picks them, so every period travels as the compact tuples below and the
// browser parses them through the schemas here. They are written against
// `zod/mini` for the reason `rows.ts` gives.
import * as z from "zod/mini";

/** The period every year falls under, and the one a bare URL shows. */
export const ALL_TIME = "all";

/** The durations the power list names, shortest first. */
export const POWER_LADDER = [
  { durationS: 5, label: "5 sec" },
  { durationS: 60, label: "1 min" },
  { durationS: 300, label: "5 min" },
  { durationS: 1200, label: "20 min" },
  { durationS: 3600, label: "1 hr" },
] as const;

export const LADDER_DURATIONS: number[] = POWER_LADDER.map(
  (rung) => rung.durationS,
);

/** How many rides each ranked list names. */
export const RECORD_ROWS = 5;

/**
 * A ranked ride: `[id, name, day, distanceM, climbM, movingS, watts]`. Every
 * one went somewhere, so the distance is never null. Watts are a power
 * meter's average, and null for a ride without one.
 */
export type RecordTuple = [
  string,
  string,
  string,
  number,
  number | null,
  number | null,
  number | null,
];

/** A power best: `[durationS, watts, id, name, day]`. */
export type PowerTuple = [number, number, string, string, string];

export interface PeriodRecords {
  /** `all`, or a year. */
  period: string;
  /** One per rung of the ladder that any ride in the period reached. */
  power: PowerTuple[];
  longest: RecordTuple[];
  climbing: RecordTuple[];
  /** The longest time moving. */
  days: RecordTuple[];
}

/** What the view renders from: one period, and every period it can pick. */
export interface RecordsPage {
  /** `all`, then each year with a ride, newest first. */
  periods: string[];
  records: PeriodRecords;
}

const recordTuple = z.tuple([
  z.string(),
  z.string(),
  z.string(),
  z.number(),
  z.nullable(z.number()),
  z.nullable(z.number()),
  z.nullable(z.number()),
]) satisfies z.ZodMiniType<RecordTuple>;

const powerTuple = z.tuple([
  z.number(),
  z.number(),
  z.string(),
  z.string(),
  z.string(),
]) satisfies z.ZodMiniType<PowerTuple>;

export const recordsPage = z.object({
  periods: z.array(z.string()),
  records: z.object({
    period: z.string(),
    power: z.array(powerTuple),
    longest: z.array(recordTuple),
    climbing: z.array(recordTuple),
    days: z.array(recordTuple),
  }),
}) satisfies z.ZodMiniType<RecordsPage>;

/** A period the page didn't render, from the route the island reads it from. */
export async function fetchRecordsPage(period: string): Promise<RecordsPage> {
  const response = await fetch(`/activity/cycling/records/${period}.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return recordsPage.parse(await response.json());
}

const YEAR = /^\d{4}$/;

/** Reads `?period=`: a year, or all time for anything else. */
export function parsePeriod(value: string | null | undefined): string {
  return value != null && YEAR.test(value) ? value : ALL_TIME;
}

export function periodLabel(period: string): string {
  return period === ALL_TIME ? "All time" : period;
}

/** A ride as the ranking reads it. */
export interface RecordRow {
  id: string;
  name: string;
  /** The local calendar day the ride started on, `YYYY-MM-DD`. */
  day: string;
  distanceM: number;
  climbM: number | null;
  movingS: number | null;
  watts: number | null;
}

/** A ride's best power over one duration. */
export interface PowerPoint {
  id: string;
  name: string;
  day: string;
  durationS: number;
  watts: number;
}

export function toRecordTuple(row: RecordRow): RecordTuple {
  const { id, name, day, distanceM, climbM, movingS, watts } = row;
  return [id, name, day, distanceM, climbM, movingS, watts];
}

export function fromRecordTuple([
  id,
  name,
  day,
  distanceM,
  climbM,
  movingS,
  watts,
]: RecordTuple): RecordRow {
  return { id, name, day, distanceM, climbM, movingS, watts };
}

/**
 * Every period's records, all time first and then each year newest first. The
 * rows need only hold each period's contenders, not every ride: the query
 * reads the leaders of each year and nothing else. Ties go to the newer ride.
 */
export function rankPeriods(
  rows: readonly RecordRow[],
  points: readonly PowerPoint[],
): PeriodRecords[] {
  if (rows.length === 0) return [];
  const years = [...new Set(rows.map((row) => row.day.slice(0, 4)))].toSorted(
    (a, b) => b.localeCompare(a),
  );
  const period = (name: string): PeriodRecords => {
    const within = (day: string) =>
      name === ALL_TIME || day.startsWith(`${name}-`);
    return rankPeriod(
      name,
      rows.filter((row) => within(row.day)),
      points.filter((point) => within(point.day)),
    );
  };
  return [period(ALL_TIME), ...years.map((year) => period(year))];
}

/**
 * One period's records and the list of every period, or null for a period
 * with no rides. All time always answers, empty before the first ride.
 */
export function pickRecords(
  periods: readonly PeriodRecords[],
  period: string,
): RecordsPage | null {
  const records = periods.find((candidate) => candidate.period === period);
  if (records !== undefined) {
    return { periods: periods.map((candidate) => candidate.period), records };
  }
  if (period !== ALL_TIME) return null;
  return {
    periods: [ALL_TIME],
    records: { period, power: [], longest: [], climbing: [], days: [] },
  };
}

function rankPeriod(
  period: string,
  rows: readonly RecordRow[],
  points: readonly PowerPoint[],
): PeriodRecords {
  const top = (measure: (row: RecordRow) => number | null) =>
    rows
      .filter((row) => (measure(row) ?? 0) > 0)
      .toSorted(
        (a, b) =>
          (measure(b) ?? 0) - (measure(a) ?? 0) || b.day.localeCompare(a.day),
      )
      .slice(0, RECORD_ROWS)
      .map((row) => toRecordTuple(row));

  const power: PowerTuple[] = [];
  for (const { durationS } of POWER_LADDER) {
    let best: PowerPoint | undefined;
    for (const point of points) {
      if (point.durationS !== durationS) continue;
      if (
        best === undefined ||
        point.watts > best.watts ||
        (point.watts === best.watts && point.day > best.day)
      ) {
        best = point;
      }
    }
    if (best !== undefined) {
      power.push([durationS, best.watts, best.id, best.name, best.day]);
    }
  }

  return {
    period,
    power,
    longest: top((row) => row.distanceM),
    climbing: top((row) => row.climbM),
    days: top((row) => row.movingS),
  };
}
