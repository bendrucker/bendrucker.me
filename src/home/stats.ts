import { TZDate } from "@date-fns/tz";
import { format, startOfMonth, startOfYear } from "date-fns";
import type { Kysely } from "kysely";
import { SITE } from "@/config";
import type { Database } from "@/db";

export const PERIODS = ["month", "year", "all"] as const;
export type Period = (typeof PERIODS)[number];

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;

export interface CyclingTotals {
  distanceMi: number;
  elevationFt: number;
  rideCount: number;
}

export interface CodeTotals {
  prCount: number;
  reviewCount: number;
  repoCount: number;
}

/**
 * Where a period begins, as an instant. The boundary is the site's own
 * midnight: a ride on the evening of the 31st belongs to the month it was
 * ridden in, whatever UTC says. All time has no start.
 */
export function periodStart(period: Period, now: Date): Date | null {
  if (period === "all") return null;
  const local = new TZDate(now, SITE.timezone);
  const start = period === "month" ? startOfMonth(local) : startOfYear(local);
  return new Date(start.getTime());
}

/** What a stat band says it covers: "september", "2026", or "all time". */
export function periodLabel(period: Period, now: Date): string {
  const local = new TZDate(now, SITE.timezone);
  if (period === "month") return format(local, "MMMM").toLowerCase();
  if (period === "year") return format(local, "yyyy");
  return "all time";
}

export type ByPeriod<T> = Record<Period, T>;

export async function queryCyclingTotals(
  db: Kysely<Database>,
  now: Date = new Date(),
): Promise<ByPeriod<CyclingTotals>> {
  const totals = await Promise.all(
    PERIODS.map(async (period) => {
      const start = periodStart(period, now);
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
    }),
  );
  return { month: totals[0]!, year: totals[1]!, all: totals[2]! };
}

/**
 * The code totals the site can compute today: one calendar year, from the
 * per-repository rows the GitHub sync keeps for it. A month or a lifetime
 * needs event-level data, which the code hub will publish.
 */
export async function queryCodeTotals(
  db: Kysely<Database>,
  now: Date = new Date(),
): Promise<CodeTotals> {
  const year = new TZDate(now, SITE.timezone).getFullYear();
  const row = await db
    .selectFrom("repoActivity")
    .where("year", "=", year)
    .select((eb) => [
      eb.fn.sum<number | null>("prCount").as("prCount"),
      eb.fn.sum<number | null>("reviewCount").as("reviewCount"),
      eb.fn.countAll<number>().as("repoCount"),
    ])
    .executeTakeFirstOrThrow();
  return {
    prCount: row.prCount ?? 0,
    reviewCount: row.reviewCount ?? 0,
    repoCount: row.repoCount,
  };
}
