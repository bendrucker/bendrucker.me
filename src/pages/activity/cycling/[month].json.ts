import type { APIRoute } from "astro";
import { queryCyclingLogPage } from "@/activity/feed";
import { getDb } from "@/db";
import { logger } from "@workspace/logger";

// This is a page endpoint. Actions POST to `/_actions/`, which none of the
// site's activity caching reaches. `isActivityPath` matches any `/activity`
// path, so a GET here gets the feed ETag, the sync-aligned `max-age`, and
// conditional 304s from `src/middleware.ts` for free. Historical months never
// change, so that caching is most of the win.

/** `YYYY-MM`. The route is public, so the month is validated. */
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const GET: APIRoute = async ({ params }) => {
  const month = params.month;
  if (month === undefined || !MONTH.test(month)) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    return Response.json(await queryCyclingLogPage(await getDb(), month));
  } catch (error) {
    logger.error({ error, month }, "Failed to load cycling log page");
    return new Response("Internal Server Error", { status: 500 });
  }
};
