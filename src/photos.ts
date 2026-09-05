import { env } from "cloudflare:workers";

// The RAW binding reaches every object in activity-hub's raw bucket, including
// telemetry files and provider JSON. This pattern is the only thing narrowing
// it to ride photos, so it matches the whole key and allows no traversal.
const PHOTO_KEY = /^raw\/strava\/activities\/\d+\/photos\/[A-Za-z0-9._-]+$/;

const A_YEAR = 31536000;

/**
 * Photo bytes are immutable under their unique id, so the only reason to
 * refetch one is that the page names a different key. The browser reads
 * this; the edge reads the same term through `cache.set`.
 */
export const PHOTO_CACHE = { maxAge: A_YEAR };
export const PHOTO_CACHE_CONTROL = `public, max-age=${A_YEAR}, immutable`;

/** The pixel size the cards show a thumbnail at, doubled for dense displays. */
export const THUMBNAIL_PX = 96;

export function isPhotoKey(key: string | undefined): key is string {
  return key !== undefined && PHOTO_KEY.test(key);
}

export function readPhoto(key: string): Promise<R2ObjectBody | null> {
  return env.RAW.get(key);
}
