import type { MiddlewareHandler } from "astro";
import { sequence } from "astro:middleware";
import { activityCachePolicy, isActivityPath } from "./middleware/cache";
import { negotiate, PRODUCES } from "./middleware/negotiate";
import { MARKDOWN_CONTENT_TYPE, representationFor } from "./representations";

const cache: MiddlewareHandler = async (context, next) => {
  const response = await next();
  const { method } = context.request;
  if (method !== "GET" && method !== "HEAD") return response;
  if (context.isPrerendered) return response;

  // `routeRules` seeds a policy when the cache is created, before the response
  // exists, and applies it with no regard for the status or an existing
  // `Cache-Control`. Opt back out for responses that must not be cached.
  if (response.status !== 200 || response.headers.has("Cache-Control")) {
    context.cache.set(false);
    return response;
  }

  if (isActivityPath(context.url.pathname)) {
    context.cache.set(activityCachePolicy(new Date()));
  }

  return response;
};

const markdown: MiddlewareHandler = async (context, next) => {
  const { request } = context;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return next();
  }

  const representation = representationFor(context.routePattern);
  if (!representation) {
    return next();
  }

  const chosen = negotiate(request.headers.get("accept"), PRODUCES);
  if (chosen === "text/markdown") {
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
