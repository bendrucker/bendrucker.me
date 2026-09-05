import type { APIContext, MiddlewareHandler } from "astro";
import { sequence } from "astro:middleware";
import { env } from "cloudflare:workers";
import { readFeedVersion } from "./activity/feed";
import { readSyncState } from "./activity/sync-state";
import { getDb, readTimestamp } from "./db";
import {
  activityCachePolicy,
  activityETag,
  activityLastModified,
  BROWSER_CACHE_CONTROL,
  cachesResponse,
  isActivityPath,
  unchanged,
  type Validators,
} from "./middleware/cache";
import { prefersMarkdown } from "./middleware/negotiate";
import { MARKDOWN_CONTENT_TYPE, representationFor } from "./representations";

const cache: MiddlewareHandler = async (context, next) => {
  const { method } = context.request;
  const conditional =
    (method === "GET" || method === "HEAD") &&
    !context.isPrerendered &&
    isActivityPath(context.url.pathname);

  if (conditional) {
    const validators = await activityValidators(context);
    context.cache.set({ ...activityCachePolicy(new Date()), ...validators });

    if (unchanged(context.request.headers, validators)) {
      return new Response(null, {
        status: 304,
        headers: {
          ...varyHeaders(context),
          "Cache-Control": BROWSER_CACHE_CONTROL,
        },
      });
    }
  }

  const response = await next();
  if (method !== "GET" && method !== "HEAD") return response;
  if (context.isPrerendered) return response;

  // Only the activity branch above sets a policy before the route runs, so
  // anywhere else one is the route's own.
  const routed = !conditional && context.cache.options.maxAge !== undefined;
  const { status, headers } = response;
  if (!cachesResponse({ status, headers, routed })) {
    context.cache.set(false);
  } else if (conditional) {
    // Set once the edge has its answer: the adapter emits the edge's policy
    // as `Cloudflare-CDN-Cache-Control`, leaving `Cache-Control` to the
    // browser, and `cachesResponse` reads a `Cache-Control` as the route's.
    headers.set("Cache-Control", BROWSER_CACHE_CONTROL);
  }

  return response;
};

async function activityValidators(context: APIContext): Promise<Validators> {
  const db = await getDb();
  const [state, feed] = await Promise.all([
    readSyncState(db),
    readFeedVersion(db),
  ]);
  const negotiable = representationFor(context.routePattern) !== undefined;
  const { id, timestamp } = env.CF_VERSION_METADATA;

  return {
    etag: activityETag(
      { github: state?.version ?? 0, feed: feed.tag, deploy: id },
      negotiable && prefersMarkdown(context.request) ? "md" : "html",
    ),
    lastModified: activityLastModified({
      github: readTimestamp(state?.changedAt ?? null),
      feed: feed.updatedAt,
      deploy: readTimestamp(timestamp),
    }),
  };
}

// A 304 answers before the markdown middleware runs, so it has to carry the
// `Vary` that middleware would have added to the full response.
function varyHeaders(context: APIContext): Record<string, string> {
  return representationFor(context.routePattern) ? { Vary: "Accept" } : {};
}

const markdown: MiddlewareHandler = async (context, next) => {
  const { request } = context;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return next();
  }

  const representation = representationFor(context.routePattern);
  if (!representation) {
    return next();
  }

  if (prefersMarkdown(request)) {
    const md = await representation.render(context);
    if (md !== null) {
      return new Response(request.method === "HEAD" ? null : md, {
        headers: {
          "Content-Type": MARKDOWN_CONTENT_TYPE,
          Vary: "Accept",
        },
      });
    }
  }

  const response = await next();
  addVary(response.headers, "Accept");
  return response;
};

export const onRequest = sequence(cache, markdown);

function addVary(headers: Headers, value: string): void {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", value);
    return;
  }
  if (existing.trim() === "*") return;
  const tokens = existing
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.includes("*")) return;
  if (tokens.some((t) => t.toLowerCase() === value.toLowerCase())) return;
  headers.set("Vary", [...tokens, value].join(", "));
}
