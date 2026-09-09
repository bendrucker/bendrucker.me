import { format } from "date-fns";
import { parseRideTime } from "@/components/cycling/datetime";
import type { Repo, Ride } from "@/activity/types";

export interface RideFeedItem {
  kind: "ride";
  at: Date;
  ride: Ride;
}

export interface RepoFeedItem {
  kind: "repo";
  at: Date;
  repo: Repo;
}

export type FeedItem = RideFeedItem | RepoFeedItem;

/**
 * One chronological feed of rides and repos, newest first. `Ride.startedAt`
 * is a local wall-clock timestamp with no zone suffix, while
 * `Repo.lastActivity` is UTC. Both are treated as instants here, which can
 * misorder a ride and a repo that land within the reader's UTC offset of each
 * other, but the two feeds are sparse enough that this rarely changes what's
 * on screen.
 */
export function mergeRecent(rides: Ride[], repos: Repo[]): FeedItem[] {
  const items: FeedItem[] = [
    ...rides.map((ride) => ({
      kind: "ride" as const,
      at: parseRideTime(ride.startedAt),
      ride,
    })),
    ...repos.map((repo) => ({
      kind: "repo" as const,
      at: new Date(repo.lastActivity),
      repo,
    })),
  ];
  return items.toSorted((a, b) => b.at.getTime() - a.at.getTime());
}

/**
 * The one "when" a feed item shows, since `RideCard` and `RepoCard` each
 * format their own date differently (a short weekday, a relative freshness).
 */
export function formatFeedDate(at: Date, now: Date = new Date()): string {
  const sameYear = at.getFullYear() === now.getFullYear();
  return format(at, sameYear ? "MMM d" : "MMM d, yyyy");
}
