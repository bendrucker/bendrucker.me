import { getDb } from "@/db";
import { rethrowLocally } from "@/fallback";
import {
  queryRecentRepos,
  queryRecentRides,
  type RecentActivity,
} from "./recent";

/**
 * Each rail falls back to empty on its own, so a failed repo query still
 * leaves the rides up. Locally the failure is thrown so the page says what
 * broke.
 */
export async function loadRecentActivity(): Promise<RecentActivity> {
  const now = new Date();
  const [rides, repos] = await Promise.all([
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
