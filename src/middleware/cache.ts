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
 *
 * The tag is weak because Cloudflare drops a strong one from any HTML it may
 * rewrite on the way out, which is every HTML response on the zone. The
 * bytes it compares are never the same across encodings anyway.
 */
export function activityETag(
  { github, feed }: ActivityVersions,
  variant: "html" | "md",
): string {
  return `W/"${github}-${feed}-${variant}"`;
}

/**
 * What the browser is told, from the same policy the edge holds. A page held
 * this long revalidates with its tag on the next visit after the sync, which
 * the edge answers with a 304 without waking the Worker.
 */
export function browserCacheControl({ maxAge, swr }: CachePolicy): string {
  return `public, max-age=${maxAge}, stale-while-revalidate=${swr}`;
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

/** What the cache middleware knows about a response once the route has run. */
export interface CacheOutcome {
  status: number;
  headers: Headers;
  /**
   * A policy the route set for itself, chosen with its own status and headers
   * already in hand.
   */
  routed: boolean;
}

/**
 * `routeRules` seeds a policy when the cache is created, before the response
 * exists, and applies it with no regard for the status or an existing
 * `Cache-Control`. A response this turns down opts back out of that policy.
 *
 * A route that set its own policy keeps it. Turning one down for carrying
 * `Cache-Control` would cost a route that renders its own response an edge
 * cache on the grounds that it also told the browser how long to hold it.
 */
export function cachesResponse({
  status,
  headers,
  routed,
}: CacheOutcome): boolean {
  if (routed) return true;
  return status === 200 && !headers.has("Cache-Control");
}
