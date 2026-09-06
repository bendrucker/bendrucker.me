import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  isPhotoKey,
  isVideoKey,
  PHOTO_CACHE,
  PHOTO_CACHE_CONTROL,
  photoUrl,
  THUMBNAIL_PX,
  THUMBNAIL_VERSION,
} from "@/photos";

/**
 * The transform, or null where it fails. Narrower than a `try` around the
 * response itself, which would redirect on a failure to read the result.
 */
async function cut(body: Parameters<typeof env.IMAGES.input>[0]) {
  try {
    return await env.IMAGES.input(body)
      .transform({ width: THUMBNAIL_PX, height: THUMBNAIL_PX, fit: "cover" })
      .output({ format: "image/jpeg", quality: 80 });
  } catch {
    return null;
  }
}

/**
 * The same square for a video, cut from its first frame, or null where it
 * fails. A transform that fails on the far side answers with a status rather
 * than throwing, and that body must not be cached for a year as a poster.
 */
async function cutFrame(body: Parameters<typeof env.MEDIA.input>[0]) {
  try {
    const frame = await env.MEDIA.input(body)
      .transform({ width: THUMBNAIL_PX, height: THUMBNAIL_PX, fit: "cover" })
      .output({ mode: "frame", time: "0s", format: "jpg" })
      .response();
    return frame.ok ? frame : null;
  } catch {
    return null;
  }
}

/**
 * The 48px square a card shows, cut from the photo: a Strava original is
 * several hundred kilobytes, and a log renders a strip of them per ride. A
 * video's square is cut from its first frame through the Media binding, since
 * the Images binding refuses one and the original runs to megabytes.
 */
export const GET: APIRoute = async ({ params, cache }) => {
  if (params.version !== String(THUMBNAIL_VERSION) || !isPhotoKey(params.key)) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await env.RAW.get(params.key);
  if (object === null) {
    return new Response("Not Found", { status: 404 });
  }

  if (isVideoKey(params.key)) {
    const frame = await cutFrame(object.body);
    // Falling back to the original is what this route exists to avoid: a card
    // would pull the whole video into a 48px `<img>` and paint nothing. The
    // strip draws its own tile for a video with no frame.
    if (frame === null) {
      return new Response("Not Found", { status: 404 });
    }

    cache.set({ ...PHOTO_CACHE, etag: object.httpEtag });
    return new Response(frame.body, {
      headers: {
        "content-type": frame.headers.get("content-type") ?? "image/jpeg",
        "cache-control": PHOTO_CACHE_CONTROL,
        etag: object.httpEtag,
      },
    });
  }

  const thumbnail = await cut(object.body);
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
