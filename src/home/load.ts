import { getDb } from "@/db";
import { rethrowLocally } from "@/fallback";
import {
  queryRecentRepos,
  queryRecentRides,
  type RecentActivity,
} from "./recent";
import {
  queryCodeTotals,
  queryCyclingTotals,
  type ByPeriod,
  type CodeTotals,
  type CyclingTotals,
} from "./stats";

export interface HomeData extends RecentActivity {
  cyclingTotals: ByPeriod<CyclingTotals>;
  codeTotals: ByPeriod<CodeTotals>;
}

const NO_TOTALS: CyclingTotals = {
  distanceMi: 0,
  elevationFt: 0,
  rideCount: 0,
};

const NO_CODE: CodeTotals = { prCount: 0, reviewCount: 0, repoCount: 0 };

/**
 * Each piece falls back to empty on its own, so a failed repo query still
 * leaves the rides up. Locally the failure is thrown so the page says what
 * broke.
 */
export async function loadHome(now: Date = new Date()): Promise<HomeData> {
  const [rides, repos, cyclingTotals, codeTotals] = await Promise.all([
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
      { month: NO_CODE, year: NO_CODE, all: NO_CODE },
    ),
  ]);
  return { rides, repos, cyclingTotals, codeTotals };
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
