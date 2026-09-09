import { getDb } from "@/db";
import { rethrowLocally } from "@/fallback";
import {
  queryRecentRepos,
  queryRecentRides,
  type RecentActivity,
} from "./recent";
import {
  queryCodeRecords,
  queryRideRecords,
  tickerItems,
  type TickerItem,
} from "./records";
import {
  queryCodeTotals,
  queryCyclingTotals,
  type ByPeriod,
  type CodeTotals,
  type CyclingTotals,
} from "./stats";

export interface HomeData extends RecentActivity {
  cyclingTotals: ByPeriod<CyclingTotals>;
  codeTotals: CodeTotals;
  ticker: TickerItem[];
}

const NO_TOTALS: CyclingTotals = {
  distanceMi: 0,
  elevationFt: 0,
  rideCount: 0,
};

/**
 * Each piece falls back to empty on its own, so a failed repo query still
 * leaves the rides up. Locally the failure is thrown so the page says what
 * broke.
 */
export async function loadHome(now: Date = new Date()): Promise<HomeData> {
  const [rides, repos, cyclingTotals, codeTotals, ticker] = await Promise.all([
    attempt(
      async () => queryRecentRides(await getDb(), now),
      "Failed to load recent rides",
      [],
    ),
    attempt(
      async () => queryRecentRepos(await getDb(), now),
      "Failed to load recent repos",
      [],
    ),
    attempt(
      async () => queryCyclingTotals(await getDb(), now),
      "Failed to load cycling totals",
      { month: NO_TOTALS, year: NO_TOTALS, all: NO_TOTALS },
    ),
    attempt(
      async () => queryCodeTotals(await getDb(), now),
      "Failed to load code totals",
      { prCount: 0, reviewCount: 0, repoCount: 0 },
    ),
    attempt(
      async () => {
        const db = await getDb();
        const [rideRecords, codeRecords] = await Promise.all([
          queryRideRecords(db),
          queryCodeRecords(db),
        ]);
        return tickerItems(rideRecords, codeRecords);
      },
      "Failed to load the ticker",
      [],
    ),
  ]);
  return { rides, repos, cyclingTotals, codeTotals, ticker };
}

async function attempt<T>(
  query: () => Promise<T>,
  message: string,
  empty: T,
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    rethrowLocally(error, message);
    return empty;
  }
}
