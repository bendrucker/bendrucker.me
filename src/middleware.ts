import type { MiddlewareHandler } from "astro";
import { negotiate, PRODUCES } from "./middleware/negotiate";
import { resolveMarkdown } from "./middleware/sources";

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request } = context;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return next();
  }

  const chosen = negotiate(request.headers.get("accept"), PRODUCES);

  if (chosen === "text/markdown") {
    const md = await resolveMarkdown(context.url.pathname);
    if (md !== null) {
      return new Response(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept",
        },
      });
    }
  }

  const response = await next();
  addVary(response.headers, "Accept");
  return response;
};

function addVary(headers: Headers, value: string): void {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", value);
    return;
  }
  const tokens = existing
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  if (tokens.some((t) => t.toLowerCase() === value.toLowerCase())) return;
  headers.set("Vary", [...tokens, value].join(", "));
}
