import type { APIRoute } from "astro";
import { queryRideById } from "@/activity/feed";
import { isEnabled } from "@/config";
import { getDb } from "@/db";
import { RIDE_ID, toRideDetailWire } from "@/rides/detail";
import { logger } from "@workspace/logger";

// A ride as the Rides list's modal shows it. Every `/rides` path gets the feed
// ETag and conditional 304s from `src/middleware.ts`, and a ride changes only
// when it syncs. The `.json` suffix outranks `[id].astro`, whose id pattern
// would refuse the name anyway.

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? "";
  if (!isEnabled("rides") || !RIDE_ID.test(id)) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const detail = await queryRideById(await getDb(), id);
    if (detail === null) return new Response("Not Found", { status: 404 });
    return Response.json(toRideDetailWire(detail));
  } catch (error) {
    logger.error({ error, id }, "Failed to load ride detail");
    return new Response("Internal Server Error", { status: 500 });
  }
};
