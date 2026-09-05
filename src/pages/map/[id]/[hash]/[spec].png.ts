import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { thinTrack } from "@/activity/track";
import { isMapSize, routeHash } from "@/components/cycling/basemap";
import { getDb } from "@/db";
import { etagMatches } from "@/middleware/cache";
import { renderBasemap } from "@/map/render";
import { parseSpec } from "@/map/spec";

/**
 * Astro decodes a path param with `decodeURI`, which leaves the characters
 * `encodeURIComponent` escaped still escaped. Rather than guess which side of
 * that a given id landed on, only ids that need no escaping are looked up.
 */
const ID = /^[\w-]{1,64}$/;

const A_YEAR = 31536000;

/** How long a superseded URL's redirect is worth holding. */
const SUPERSEDED = 300;

export const GET: APIRoute = async ({ params, cache, request }) => {
  const spec = parseSpec(params.spec ?? "");
  const id = params.id;
  if (spec === null || id === undefined || !ID.test(id)) return notFound();

  const { width, height, scale, theme } = spec;
  if (!isMapSize(width, height)) return notFound();

  const db = await getDb();
  const row = await db
    .selectFrom("activityFeed")
    .select("polyline")
    .where("activityId", "=", id)
    .executeTakeFirst();
  if (row?.polyline == null) return notFound();

  // The card draws `Ride.route`, which is the stored polyline bounded the same
  // way. Reading it back through the same helper is what keeps the basemap
  // under the line.
  const { route, coordinates } = thinTrack(row.polyline);
  if (coordinates.length < 2) return notFound();

  // The hash names the track the image is of, so only its own URL renders one.
  // A page cached before the ride was re-synced is pointed at the current
  // image, which costs a redirect rather than a render and leaves an unbounded
  // caller no URL of its choosing to make the worker draw.
  const hash = routeHash(route);
  if (hash !== params.hash) {
    cache.set({ maxAge: SUPERSEDED });
    return new Response(null, {
      status: 302,
      headers: {
        location: `/map/${id}/${hash}/${params.spec}.png`,
        "cache-control": `public, max-age=${SUPERSEDED}`,
      },
    });
  }

  // Two caches, steered apart. `cache.set` drives Cloudflare's edge through
  // the adapter's `Cloudflare-CDN-Cache-Control`, which leaves `Cache-Control`
  // to say what the browser should do. The URL is now known to name this exact
  // track, so both can hold it indefinitely.
  // The hash names the track, and one track is drawn at several sizes, scales
  // and themes. A validator has to name the representation rather than the
  // ride, or a cache holding one of them answers a request for another.
  const etag = `"${hash}-${width}x${height}@${scale}x-${theme}"`;
  cache.set({ maxAge: A_YEAR, etag });

  const headers = {
    "content-type": "image/png",
    "cache-control": `public, max-age=${A_YEAR}, immutable`,
    etag,
  };

  // Answered before the tiles are fetched and rasterized, which is the whole
  // cost of the route.
  if (etagMatches(request.headers.get("If-None-Match"), etag)) {
    return new Response(null, { status: 304, headers });
  }

  const png = await renderBasemap({
    coordinates,
    width,
    height,
    scale,
    theme,
    key: env.CARTO_BASEMAP_KEY,
  });

  return new Response(png, { headers });
};

function notFound(): Response {
  return new Response("Not Found", { status: 404 });
}
