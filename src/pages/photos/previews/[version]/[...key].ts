import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import type { Cut } from "@/photos";
import {
  isPhotoKey,
  PHOTO_CACHE,
  PREVIEW_PX,
  PREVIEW_VERSION,
  serveThumbnail,
} from "@/photos";

// Bounded by height and never enlarged, so a shot keeps its own shape and the
// gallery can lay it out at its real aspect ratio.
const BOUNDED = { height: PREVIEW_PX, fit: "scale-down" } as const;

/** The transform, or null where it fails. See the thumbnail route. */
const image: Cut = async (body) => {
  try {
    const preview = await env.IMAGES.input(body)
      .transform(BOUNDED)
      .output({ format: "image/jpeg", quality: 80 });
    return { body: preview.image(), contentType: preview.contentType() };
  } catch {
    return null;
  }
};

/** A video's first frame at the same bound, never cached when the cut fails. */
const frame: Cut = async (body) => {
  try {
    const cut = await env.MEDIA.input(body)
      .transform(BOUNDED)
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
 * The shot a ride page shows in its strip and gallery. A Strava original runs
 * to several megabytes and the thumbnail is a 96px square, which is neither
 * the size nor the shape the page draws.
 */
export const GET: APIRoute = async ({ params, cache }) => {
  if (params.version !== String(PREVIEW_VERSION) || !isPhotoKey(params.key)) {
    return new Response("Not Found", { status: 404 });
  }

  return serveThumbnail(env.RAW, params.key, { image, frame }, (etag) => {
    cache.set({ ...PHOTO_CACHE, etag });
  });
};
