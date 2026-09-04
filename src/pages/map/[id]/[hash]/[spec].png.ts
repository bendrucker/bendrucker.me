import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { decodePolyline, thinPolyline } from "@/activity/track";
import { isMapSize, routeHash } from "@/components/cycling/basemap";
import { getDb } from "@/db";
import { renderBasemap } from "@/map/render";

// Matched whole, with the dimensions checked against `isMapSize`.
const SPEC = /^(\d{1,4})x(\d{1,4})(-dark)?$/;

const A_YEAR = 31536000;

/** A stale hash came from a page cached before the ride was re-synced. */
const SUPERSEDED = 300;

export const GET: APIRoute = async ({ params, cache }) => {
  const spec = SPEC.exec(params.spec ?? "");
  const id = params.id;
  if (spec === null || id === undefined) return notFound();

  const width = Number(spec[1]);
  const height = Number(spec[2]);
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
  const route = thinPolyline(row.polyline);
  const coordinates = decodePolyline(route);
  if (coordinates.length < 2) return notFound();

  const png = await renderBasemap({
    coordinates,
    width,
    height,
    theme: spec[3] === undefined ? "light" : "dark",
    ...(env.CARTO_BASEMAP_KEY ? { key: env.CARTO_BASEMAP_KEY } : {}),
  });

  // Two caches, steered apart. `cache.set` drives Cloudflare's edge through
  // the adapter's `Cloudflare-CDN-Cache-Control`, which leaves `Cache-Control`
  // to the browser. The hash covers the track and the basemap version, so a
  // matching one can be kept for good. Only the browser gets `immutable`,
  // since the edge is the copy worth retiring early on a re-sync.
  const hash = routeHash(route);
  const seconds = hash === params.hash ? A_YEAR : SUPERSEDED;
  cache.set({ maxAge: seconds, etag: `"${hash}"` });

  return new Response(png, {
    headers: {
      "content-type": "image/png",
      "cache-control": `public, max-age=${seconds}${seconds === A_YEAR ? ", immutable" : ""}`,
    },
  });
};

function notFound(): Response {
  return new Response("Not Found", { status: 404 });
}
