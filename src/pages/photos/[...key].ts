import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import {
  contentRange,
  isPhotoKey,
  isVideoKey,
  PHOTO_CACHE,
  PHOTO_CACHE_CONTROL,
} from "@/photos";

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
  } catch {
    return new Response("Range Not Satisfiable", {
      status: 416,
      headers: { "accept-ranges": "bytes" },
    });
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
