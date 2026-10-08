import type { APIRoute } from "astro";
import { getDb } from "@/db";
import { queryRideRecords } from "@/rides/query";
import { ALL_TIME, parsePeriod, pickRecords } from "@/rides/records";
import { logger } from "@workspace/logger";

// One period of the Rides route's records, which the island fetches when the
// reader picks a period the page didn't render. Under `/activity` for the feed
// ETag and conditional 304s `src/middleware.ts` gives every path there.

export const GET: APIRoute = async ({ params }) => {
  const requested = params.period;
  // `parsePeriod` reads anything else as all time, which a URL of its own
  // shouldn't answer for.
  if (
    requested === undefined ||
    (requested !== ALL_TIME && parsePeriod(requested) !== requested)
  ) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const page = pickRecords(await queryRideRecords(await getDb()), requested);
    if (page === null) return new Response("Not Found", { status: 404 });
    return Response.json(page);
  } catch (error) {
    logger.error({ error, period: requested }, "Failed to load ride records");
    return new Response("Internal Server Error", { status: 500 });
  }
};
