// A page whose query fails renders empty rather than 500ing: a reader is
// better served by a page with nothing on it than by an error. Locally that
// same fallback makes a broken query, an unapplied migration, and a database
// nobody seeded all render as "no rides yet", which is how a basemap went a
// year without rendering in production and nothing said so.
import { env } from "cloudflare:workers";
import { logger } from "@workspace/logger";

/**
 * Whether a swallowed failure is worse than an error page here.
 *
 * `astro dev` sets `DEV`. `wrangler dev` serves the production build, where it
 * is false, so `dev:worker` passes `--var LOCAL_ERRORS:true` instead. The
 * request cannot answer this: the adapter rewrites its URL to the configured
 * site, so every host looks like production from inside the worker.
 */
export function isLocal(): boolean {
  return import.meta.env.DEV || env.LOCAL_ERRORS === "true";
}

/**
 * Records a failure a page is about to swallow, and refuses to swallow it
 * locally. Call it from the catch, then fall back as usual: the fallback is
 * unreachable on a local run, so a broken query arrives as a stack trace
 * instead of a blank page.
 */
export function rethrowLocally(
  error: unknown,
  message: string,
  context: Record<string, unknown> = {},
): void {
  logger.error({ error, ...context }, message);
  if (isLocal()) throw error;
}
