import type { APIContext, MiddlewareHandler } from "astro";
import { sequence } from "astro:middleware";
import { readSyncState } from "./activity/sync-state";
import { getDb } from "./db";
import {
  activityCachePolicy,
  activityETag,
  etagMatches,
  isActivityPath,
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
    const etag = await syncETag(context);
    context.cache.set({ ...activityCachePolicy(new Date()), etag });

    if (etagMatches(context.request.headers.get("If-None-Match"), etag)) {
      return new Response(null, { status: 304, headers: varyHeaders(context) });
    }
  }

  const response = await next();
  if (method !== "GET" && method !== "HEAD") return response;
  if (context.isPrerendered) return response;

  // `routeRules` seeds a policy when the cache is created, before the response
  // exists, and applies it with no regard for the status or an existing
  // `Cache-Control`. Opt back out for responses that must not be cached.
  if (response.status !== 200 || response.headers.has("Cache-Control")) {
    context.cache.set(false);
  }

  return response;
};

async function syncETag(context: APIContext): Promise<string> {
  const state = await readSyncState(await getDb());
  const negotiable = representationFor(context.routePattern) !== undefined;

  return activityETag(
    state?.version ?? 0,
    negotiable && prefersMarkdown(context.request) ? "md" : "html",
  );
}

// A 304 answers before the markdown middleware runs, so it has to carry the
// `Vary` that middleware would have added to the full response.
function varyHeaders(context: APIContext): HeadersInit {
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
