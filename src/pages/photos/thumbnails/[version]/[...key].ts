import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import type { Cut } from "@/photos";
import {
  isPhotoKey,
  PHOTO_CACHE,
  serveThumbnail,
  THUMBNAIL_PX,
  THUMBNAIL_VERSION,
} from "@/photos";

const SQUARE = {
  width: THUMBNAIL_PX,
  height: THUMBNAIL_PX,
  fit: "cover",
} as const;

/**
 * The transform, or null where it fails. Narrower than a `try` around the
 * response itself, which would redirect on a failure to read the result.
 */
const image: Cut = async (body) => {
  try {
    const square = await env.IMAGES.input(body)
      .transform(SQUARE)
      .output({ format: "image/jpeg", quality: 80 });
    return { body: square.image(), contentType: square.contentType() };
  } catch {
    return null;
  }
};

/**
 * The same square for a video, cut from its first frame. A transform that fails
 * on the far side answers with a status rather than throwing, and that body must
 * not be cached for a year as a poster.
 */
const frame: Cut = async (body) => {
  try {
    const cut = await env.MEDIA.input(body)
      .transform(SQUARE)
      .output({ mode: "frame", time: "0s", format: "jpg" })
      .response();
    if (!cut.ok) return null;
    return {
      body: cut.body,
      contentType: cut.headers.get("content-type") ?? "image/jpeg",
    };
  } catch {
    return null;
  }
};

/**
 * The 48px square a card shows, cut from the photo: a Strava original is several
 * hundred kilobytes, and a log renders a strip of them per ride.
 */
export const GET: APIRoute = async ({ params, cache }) => {
  if (params.version !== String(THUMBNAIL_VERSION) || !isPhotoKey(params.key)) {
    return new Response("Not Found", { status: 404 });
  }

  return serveThumbnail(env.RAW, params.key, { image, frame }, (etag) => {
    cache.set({ ...PHOTO_CACHE, etag });
  });
};
