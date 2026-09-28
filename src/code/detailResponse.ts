// The `.json` beside a repository's or a project's page, which the Code list's
// modal fetches. Kept apart from `detail.ts` because it reaches the worker's
// database binding, which tests have no module for.
import { isEnabled } from "@/config";
import { getDb } from "@/db";
import { logger } from "@workspace/logger";
import { loadCodeDetail } from "./detail";

export async function codeDetailResponse(key: string): Promise<Response> {
  if (!isEnabled("code")) return new Response("Not Found", { status: 404 });
  try {
    const detail = await loadCodeDetail(await getDb(), key);
    if (detail === null) return new Response("Not Found", { status: 404 });
    return Response.json(detail);
  } catch (error) {
    logger.error({ error, key }, "Failed to load code detail");
    return new Response("Internal Server Error", { status: 500 });
  }
}
