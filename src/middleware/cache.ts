// Activity pages render from D1 that the github worker cron ("0 * * * *")
// refreshes at the top of every hour. Their max-age expires just after the
// next sync completes, which sets how often a cached response revalidates.
// The ETag then decides whether that revalidation costs a re-render or a 304.
// Everything else changes only on deploy and is covered by `routeRules` in
// astro.config.ts, and the Workers Cache key includes the Worker version, so
// deploys invalidate it regardless of TTL.
const ACTIVITY_SYNC_BUFFER_SECONDS = 300;

export interface CachePolicy {
  maxAge: number;
  swr: number;
}

export function isActivityPath(pathname: string): boolean {
  return pathname.startsWith("/activity");
}

export function activityCachePolicy(now: Date): CachePolicy {
  return { maxAge: activityMaxAge(now), swr: 3600 };
}

export interface ActivityVersions {
  /** `sync_state.version`, which moves only when the github cron changed a row. */
  github: number;
  /** The activity feed's fingerprint, from `readFeedVersion`. */
  feed: string;
}

/**
 * Both datasets go into every activity page's tag rather than the one the
 * page reads, which costs a re-render of the other page when either changes
 * and saves the middleware knowing which page is which. The variant is part
 * of the tag because `/activity/code` serves HTML or markdown at one URL, by
 * `Accept`.
 */
export function activityETag(
  { github, feed }: ActivityVersions,
  variant: "html" | "md",
): string {
  return `"${github}-${feed}-${variant}"`;
}

export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;

  const header = ifNoneMatch.trim();
  if (header === "*") return true;

  const target = opaque(etag);
  return header.split(",").some((tag) => opaque(tag.trim()) === target);
}

// `If-None-Match` compares weakly, so `W/"x"` and `"x"` are the same validator.
function opaque(tag: string): string {
  return tag.startsWith("W/") ? tag.slice(2) : tag;
}

export function activityMaxAge(now: Date): number {
  const hour = new Date(now);
  hour.setUTCMinutes(0, 0, 0);
  let synced = hour.getTime() + ACTIVITY_SYNC_BUFFER_SECONDS * 1000;
  if (synced <= now.getTime()) {
    synced += 60 * 60 * 1000;
  }
  return Math.ceil((synced - now.getTime()) / 1000);
}
