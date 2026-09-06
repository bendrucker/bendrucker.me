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

// The extensions the Images binding resizes. `PHOTO_KEY` admits any extension,
// so a key matching neither this nor `VIDEO_KEY` could be carrying anything,
// and nothing may hand it to an `<img>` on the strength of a guess.
const IMAGE_KEY = /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i;

export function isImageKey(key: string): boolean {
  return IMAGE_KEY.test(key);
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

/** What a photo response reads off a stored object. */
export interface PhotoObject {
  body: ReadableStream;
  size: number;
  httpEtag: string;
  httpMetadata?: { contentType?: string };
  range?: R2Range;
}

/** The part of an R2 bucket the photo routes reach for. */
export interface PhotoBucket {
  get(key: string, options?: { range?: Headers }): Promise<PhotoObject | null>;
  head(key: string): Promise<{ size: number } | null>;
}

/** Holds the response at the edge under the term photos are served on. */
export type CachePhoto = (etag: string) => void;

function notFound(): Response {
  return new Response("Not Found", { status: 404 });
}

/**
 * The 416 answer, naming the object's length. A browser that asked past the
 * end works the range it should have asked for out of that.
 */
async function unsatisfiable(
  bucket: PhotoBucket,
  key: string,
): Promise<Response> {
  const headers = new Headers({ "accept-ranges": "bytes" });
  const head = await bucket.head(key);
  if (head !== null) headers.set("content-range", `bytes */${head.size}`);
  return new Response("Range Not Satisfiable", { status: 416, headers });
}

/**
 * The object's bytes, whole or partial. R2 parses the `Range` header itself and
 * reports back the range it resolved, which is what a `<video>` seeks against.
 */
export async function servePhoto(
  bucket: PhotoBucket,
  key: string,
  request: Request,
  cache: CachePhoto,
): Promise<Response> {
  const ranged = request.headers.has("range");

  // A range past the end of the object throws, where a missing key returns null.
  let object;
  try {
    object = await bucket.get(
      key,
      ranged ? { range: request.headers } : undefined,
    );
  } catch (error) {
    // Only a request carrying a range can be unsatisfiable. Anything else is
    // the store failing, and a 416 would blame the reader for it.
    if (!ranged) throw error;
    return unsatisfiable(bucket, key);
  }
  if (object === null) return notFound();

  // An object stored without a content type would otherwise serve a video's
  // bytes as a JPEG, which a `<video>` refuses to decode.
  const fallbackType = isVideoKey(key) ? "video/mp4" : "image/jpeg";

  const headers = new Headers({
    "content-type": object.httpMetadata?.contentType ?? fallbackType,
    "cache-control": PHOTO_CACHE_CONTROL,
    "accept-ranges": "bytes",
    etag: object.httpEtag,
  });

  // The request decides this. `object.range` comes back filled in with the whole
  // object even for a get that asked for no range at all.
  if (!ranged) {
    cache(object.httpEtag);
    return new Response(object.body, { headers });
  }

  // Caching a partial would hand those bytes to the next reader asking for the
  // whole object, since both arrive under this URL.
  headers.set(
    "content-range",
    contentRange(object.range ?? { offset: 0 }, object.size),
  );
  return new Response(object.body, { status: 206, headers });
}

/** A transformed square, or null where the transform failed. */
export interface Square {
  body: ReadableStream | null;
  contentType: string;
}

export type Cut = (body: ReadableStream) => Promise<Square | null>;

/**
 * The 48px square a card shows, cut from the photo, or from a video's first
 * frame. Where a video's cut fails the answer is a 404 rather than the
 * original: a 48px `<img>` pointed at an eleven megabyte MP4 downloads all of
 * it and paints nothing.
 */
export async function serveThumbnail(
  bucket: PhotoBucket,
  key: string,
  cut: { image: Cut; frame: Cut },
  cache: CachePhoto,
): Promise<Response> {
  const object = await bucket.get(key);
  if (object === null) return notFound();

  // The URL names the transform, so the original's tag is the thumbnail's.
  const square = ({ body, contentType }: Square) => {
    cache(object.httpEtag);
    return new Response(body, {
      headers: {
        "content-type": contentType,
        "cache-control": PHOTO_CACHE_CONTROL,
        etag: object.httpEtag,
      },
    });
  };

  if (isVideoKey(key)) {
    // The strip draws its own tile for a video with no frame.
    const frame = await cut.frame(object.body);
    return frame === null ? notFound() : square(frame);
  }

  const thumbnail = await cut.image(object.body);
  if (thumbnail !== null) return square(thumbnail);

  // The original still draws the card, but only where the key names an image. A
  // key naming neither could be a video, and redirecting a 48px `<img>` at one
  // downloads the whole file.
  if (!isImageKey(key)) return notFound();
  // A redirect keeps the failure short-lived at the edge.
  return new Response(null, {
    status: 302,
    headers: { location: photoUrl(key) },
  });
}
