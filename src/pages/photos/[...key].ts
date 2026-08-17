import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

// The RAW binding reaches every object in activity-hub's raw bucket, including
// telemetry files and provider JSON. This pattern is the only thing narrowing
// it to ride photos, so it matches the whole key and allows no traversal.
const PHOTO_KEY = /^raw\/strava\/activities\/\d+\/photos\/[A-Za-z0-9._-]+$/;

// Photo bytes are immutable under their unique id, so the only reason to
// refetch one is that the page names a different key.
const CACHE_CONTROL = "public, max-age=31536000, immutable";

export const GET: APIRoute = async ({ params }) => {
  const key = params.key;
  if (key === undefined || !PHOTO_KEY.test(key)) {
    return new Response("Not Found", { status: 404 });
  }

  const object = await env.RAW.get(key);
  if (object === null) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "image/jpeg",
      "cache-control": CACHE_CONTROL,
      etag: object.httpEtag,
    },
  });
};
