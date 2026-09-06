import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  contentRange,
  isPhotoKey,
  isVideoKey,
  PHOTO_CACHE,
  PHOTO_CACHE_CONTROL,
} from "@/photos";

/**
 * The 416 answer, naming the object's length. A browser that asked past the
 * end works the range it should have asked for out of that.
 */
async function unsatisfiable(key: string): Promise<Response> {
  const headers = new Headers({ "accept-ranges": "bytes" });
  const head = await env.RAW.head(key);
  if (head !== null) headers.set("content-range", `bytes */${head.size}`);
  return new Response("Range Not Satisfiable", { status: 416, headers });
}

export const GET: APIRoute = async ({ params, request, cache }) => {
  if (!isPhotoKey(params.key)) {
    return new Response("Not Found", { status: 404 });
  }

  // R2 parses the `Range` header itself and reports back the range it resolved,
  // which is what a `<video>` seeks against.
  const ranged = request.headers.has("range");

  // A range past the end of the object throws, where a missing key returns null.
  let object;
  try {
    object = await env.RAW.get(
      params.key,
      ranged ? { range: request.headers } : undefined,
    );
  } catch (error) {
    // Only a request carrying a range can be unsatisfiable. Anything else is
    // the store failing, and a 416 would blame the reader for it.
    if (!ranged) throw error;
    return unsatisfiable(params.key);
  }
  if (object === null) {
    return new Response("Not Found", { status: 404 });
  }

  // An object stored without a content type would otherwise serve a video's
  // bytes as a JPEG, which a `<video>` refuses to decode.
  const fallbackType = isVideoKey(params.key) ? "video/mp4" : "image/jpeg";

  const headers = new Headers({
    "content-type": object.httpMetadata?.contentType ?? fallbackType,
    "cache-control": PHOTO_CACHE_CONTROL,
    "accept-ranges": "bytes",
    etag: object.httpEtag,
  });

  // The request decides this. `object.range` comes back filled in with the
  // whole object even for a get that asked for no range at all.
  if (!ranged) {
    cache.set({ ...PHOTO_CACHE, etag: object.httpEtag });
    return new Response(object.body, { headers });
  }

  // Caching a partial would hand those bytes to the next reader asking for the
  // whole object, since both arrive under this URL.
  headers.set(
    "content-range",
    contentRange(object.range ?? { offset: 0 }, object.size),
  );
  return new Response(object.body, { status: 206, headers });
};
