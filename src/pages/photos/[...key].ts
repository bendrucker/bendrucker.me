import type { APIRoute } from "astro";
import {
  isPhotoKey,
  PHOTO_CACHE,
  PHOTO_CACHE_CONTROL,
  readPhoto,
} from "@/photos";

export const GET: APIRoute = async ({ params, cache }) => {
  if (!isPhotoKey(params.key)) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await readPhoto(params.key);
  if (object === null) {
    return new Response("Not Found", { status: 404 });
  }

  cache.set({ ...PHOTO_CACHE, etag: object.httpEtag });
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "image/jpeg",
      "cache-control": PHOTO_CACHE_CONTROL,
      etag: object.httpEtag,
    },
  });
};
