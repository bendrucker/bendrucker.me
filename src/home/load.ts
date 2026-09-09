import { getDb } from "@/db";
import { rethrowLocally } from "@/fallback";
import { queryRecentActivity, type RecentActivity } from "./recent";

/**
 * What a homepage variant renders. Empty rails on a failed query, except
 * locally, where the failure is thrown so the page says what broke.
 */
export async function loadRecentActivity(): Promise<RecentActivity> {
  try {
    return await queryRecentActivity(await getDb());
  } catch (error) {
    rethrowLocally(error, "Failed to load recent activity");
    return { rides: [], repos: [] };
  }
}
