import type { APIRoute } from "astro";
import { getDb } from "@/db";
import { queryRideIndex } from "@/rides/query";
import type { RideIndex } from "@/rides/rows";
import { logger } from "@workspace/logger";

// Every ride as a five-value row, which the Rides route fetches once a reader
// starts a search and filters in the browser from then on. It lives under
// `/activity` for the feed ETag and conditional 304s `src/middleware.ts` gives
// every path there, since it only changes when a ride syncs. A static route
// outranks `[month].json`, whose pattern would refuse this name anyway.

export const GET: APIRoute = async () => {
  try {
    const index: RideIndex = { rides: await queryRideIndex(await getDb()) };
    return Response.json(index);
  } catch (error) {
    logger.error({ error }, "Failed to load the ride index");
    return new Response("Internal Server Error", { status: 500 });
  }
};
