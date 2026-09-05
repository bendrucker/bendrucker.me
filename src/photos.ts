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

/**
 * Bumped with any change to the transform above: its size, crop, or encoding.
 * A thumbnail is immutable under a URL this feeds, so a bump is the only
 * thing that retires the ones browsers and the edge already hold.
 */
export const THUMBNAIL_VERSION = 1;

// Strava publishes a ride's videos into the same photo prefix as its photos,
// so the extension is the only thing that separates them. Media
// Transformations guarantees MP4/H.264; the other two are here because a key
// carrying one still must not be handed to an `<img>`.
const VIDEO_KEY = /\.(mp4|mov|m4v)$/i;

export function isPhotoKey(key: string | undefined): key is string {
  return key !== undefined && PHOTO_KEY.test(key);
}

export function isVideoKey(key: string): boolean {
  return VIDEO_KEY.test(key);
}

/**
 * The `content-range` a `206` answers with. R2 resolves whichever of the three
 * shapes the request asked for, so the last byte has to be worked back out
 * from the object's own size.
 */
export function contentRange(range: R2Range, size: number): string {
  if ("suffix" in range) {
    return `bytes ${size - range.suffix}-${size - 1}/${size}`;
  }
  const first = range.offset ?? 0;
  const last = range.length === undefined ? size - 1 : first + range.length - 1;
  return `bytes ${first}-${last}/${size}`;
}

export function photoUrl(key: string): string {
  return `/photos/${key}`;
}

export function thumbnailUrl(key: string): string {
  return `/photos/thumbnails/${THUMBNAIL_VERSION}/${key}`;
}
