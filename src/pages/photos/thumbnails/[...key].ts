import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  isPhotoKey,
  PHOTO_CACHE,
  PHOTO_CACHE_CONTROL,
  readPhoto,
  THUMBNAIL_PX,
} from "@/photos";

/**
 * The 48px square a card shows, cut from the photo: a Strava original is
 * several hundred kilobytes, and a log renders a strip of them per ride.
 */
export const GET: APIRoute = async ({ params, cache }) => {
  if (!isPhotoKey(params.key)) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await readPhoto(params.key);
  if (object === null) {
    return new Response("Not Found", { status: 404 });
  }

  let thumbnail;
  try {
    thumbnail = await env.IMAGES.input(object.body)
      .transform({ width: THUMBNAIL_PX, height: THUMBNAIL_PX, fit: "cover" })
      .output({ format: "image/jpeg", quality: 80 });
  } catch {
    // The original still draws the card. A redirect keeps the failure
    // short-lived at the edge.
    return new Response(null, {
      status: 302,
      headers: { location: `/photos/${params.key}` },
    });
  }

  cache.set({ ...PHOTO_CACHE, etag: object.httpEtag });
  return new Response(thumbnail.image(), {
    headers: {
      "content-type": thumbnail.contentType(),
      "cache-control": PHOTO_CACHE_CONTROL,
      etag: object.httpEtag,
    },
  });
};
