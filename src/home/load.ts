import { getDb } from "@/db";
import { rethrowLocally } from "@/fallback";
import {
  queryRecentRepos,
  queryRecentRides,
  type RecentActivity,
} from "./recent";

/**
 * Each list falls back to empty on its own, so a failed repo query still
 * leaves the rides up. Locally the failure is thrown so the page says what
 * broke.
 */
export async function loadHome(): Promise<RecentActivity> {
  const [rides, repos] = await Promise.all([
    attempt(
      async () => queryRecentRides(await getDb()),
      "Failed to load recent rides",
      [],
    ),
    attempt(
      async () => queryRecentRepos(await getDb()),
      "Failed to load recent repos",
      [],
    ),
  ]);
  return { rides, repos };
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
