import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  isPhotoKey,
  PHOTO_CACHE,
  PHOTO_CACHE_CONTROL,
  photoUrl,
  THUMBNAIL_PX,
  THUMBNAIL_VERSION,
} from "@/photos";

/**
 * The 48px square a card shows, cut from the photo: a Strava original is
 * several hundred kilobytes, and a log renders a strip of them per ride.
 */
export const GET: APIRoute = async ({ params, cache }) => {
  if (params.version !== String(THUMBNAIL_VERSION) || !isPhotoKey(params.key)) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await env.RAW.get(params.key);
  if (object === null) {
    return new Response("Not Found", { status: 404 });
  }

  const thumbnail = await env.IMAGES.input(object.body)
    .transform({ width: THUMBNAIL_PX, height: THUMBNAIL_PX, fit: "cover" })
    .output({ format: "image/jpeg", quality: 80 })
    .catch(() => null);
  if (thumbnail === null) {
    // The original still draws the card. A redirect keeps the failure
    // short-lived at the edge.
    return new Response(null, {
      status: 302,
      headers: { location: photoUrl(params.key) },
    });
  }

  // The URL names the transform, so the original's tag is the thumbnail's.
  cache.set({ ...PHOTO_CACHE, etag: object.httpEtag });
  return new Response(thumbnail.image(), {
    headers: {
      "content-type": thumbnail.contentType(),
      "cache-control": PHOTO_CACHE_CONTROL,
      etag: object.httpEtag,
    },
  });
};
