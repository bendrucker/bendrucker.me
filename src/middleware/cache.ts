// Activity pages render from D1 that the github worker cron ("0 * * * *")
// refreshes at the top of every hour. Their max-age expires just after the
// next sync completes, so cached responses only bust when new data can
// actually exist. Everything else changes only on deploy and is covered by
// `routeRules` in astro.config.ts, and the Workers Cache key includes the
// Worker version, so deploys invalidate it regardless of TTL.
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

export function activityMaxAge(now: Date): number {
  const hour = new Date(now);
  hour.setUTCMinutes(0, 0, 0);
  let synced = hour.getTime() + ACTIVITY_SYNC_BUFFER_SECONDS * 1000;
  if (synced <= now.getTime()) {
    synced += 60 * 60 * 1000;
  }
  return Math.ceil((synced - now.getTime()) / 1000);
}
