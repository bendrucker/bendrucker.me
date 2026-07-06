// Activity pages render from D1 that the github worker cron ("0 * * * *")
// refreshes at the top of every hour. Their max-age expires just after the
// next sync completes, so cached responses only bust when new data can
// actually exist. Everything else changes only on deploy, and the Workers
// Cache key includes the Worker version, so deploys invalidate it
// regardless of TTL.
const ACTIVITY_SYNC_BUFFER_SECONDS = 300;

export const DEFAULT_CACHE_CONTROL =
  "public, max-age=3600, stale-while-revalidate=86400";

export function cacheControl(pathname: string, now: Date): string {
  if (!pathname.startsWith("/activity")) {
    return DEFAULT_CACHE_CONTROL;
  }
  return `public, max-age=${activityMaxAge(now)}, stale-while-revalidate=3600`;
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
