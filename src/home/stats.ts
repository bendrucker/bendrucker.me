import { subDays } from "date-fns";
import type { Kysely } from "kysely";
import type { Database } from "@/db";

export const PERIODS = ["month", "year", "all"] as const;
export type Period = (typeof PERIODS)[number];

/** The middle distance: recent enough to move, long enough to add up. */
export const DEFAULT_PERIOD: Period = "year";

/** What the toggle shows for a window, and what it says to a screen reader. */
export const PERIOD_LABELS: Record<Period, { short: string; name: string }> = {
  month: { short: "30d", name: "Past 30 days" },
  year: { short: "1y", name: "Past year" },
  all: { short: "all", name: "All time" },
};

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;

export interface CyclingTotals {
  distanceMi: number;
  elevationFt: number;
  rideCount: number;
}

/** A count the data cannot give for the window is null rather than zero. */
export interface CodeTotals {
  prCount: number | null;
  reviewCount: number | null;
  repoCount: number;
}

/**
 * Where a window begins, as an instant. The windows roll: the past thirty
 * days and the past year, so the numbers move every day rather than
 * resetting on the first of the month. All time has no start.
 */
export function periodStart(period: Period, now: Date): Date | null {
  if (period === "all") return null;
  return subDays(now, period === "month" ? 30 : 365);
}

export type ByPeriod<T> = Record<Period, T>;

async function byPeriod<T>(
  query: (start: Date | null) => Promise<T>,
  now: Date,
): Promise<ByPeriod<T>> {
  const [month, year, all] = await Promise.all(
    PERIODS.map(async (period) => query(periodStart(period, now))),
  );
  return { month: month!, year: year!, all: all! };
}

export async function queryCyclingTotals(
  db: Kysely<Database>,
  now: Date = new Date(),
): Promise<ByPeriod<CyclingTotals>> {
  return byPeriod(async (start) => {
    const row = await db
      .selectFrom("activityFeed")
      .where("sport", "=", "ride")
      .$if(start !== null, (qb) =>
        qb.where("startedAt", ">=", start!.toISOString()),
      )
      .select((eb) => [
        eb.fn.sum<number | null>("distanceM").as("distanceM"),
        eb.fn.sum<number | null>("elevationM").as("elevationM"),
        eb.fn.countAll<number>().as("rideCount"),
      ])
      .executeTakeFirstOrThrow();
    return {
      distanceMi: (row.distanceM ?? 0) / METERS_PER_MILE,
      elevationFt: (row.elevationM ?? 0) * FEET_PER_METER,
      rideCount: row.rideCount,
    };
  }, now);
}

/**
 * The GitHub sync keeps one row per repository per year, stamped with the
 * last activity in it. A row belongs to a window when that stamp does, which
 * counts repositories exactly and counts a year's pull requests and reviews
 * closely enough. Over thirty days it would count a whole year's worth, so
 * those two stay null until the code hub publishes event-level data.
 */
export async function queryCodeTotals(
  db: Kysely<Database>,
  now: Date = new Date(),
): Promise<ByPeriod<CodeTotals>> {
  const totals = await byPeriod(async (start) => {
    const since = start ? Math.floor(start.getTime() / 1000) : null;
    return db
      .selectFrom("repoActivity")
      .$if(since !== null, (qb) => qb.where("lastActivity", ">=", since!))
      .select((eb) => [
        eb.fn.sum<number | null>("prCount").as("prCount"),
        eb.fn.sum<number | null>("reviewCount").as("reviewCount"),
        eb.fn.count<number>("repoId").distinct().as("repoCount"),
      ])
      .executeTakeFirstOrThrow();
  }, now);
  const counts = (period: Period): CodeTotals => ({
    prCount: period === "month" ? null : (totals[period].prCount ?? 0),
    reviewCount: period === "month" ? null : (totals[period].reviewCount ?? 0),
    repoCount: totals[period].repoCount,
  });
  return { month: counts("month"), year: counts("year"), all: counts("all") };
}
