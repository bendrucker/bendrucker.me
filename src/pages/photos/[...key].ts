import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { isPhotoKey, PHOTO_CACHE, servePhoto } from "@/photos";

export const GET: APIRoute = async ({ params, request, cache }) => {
  if (!isPhotoKey(params.key)) {
    return new Response("Not Found", { status: 404 });
  }

  return servePhoto(env.RAW, params.key, request, (etag) => {
    cache.set({ ...PHOTO_CACHE, etag });
  });
};
