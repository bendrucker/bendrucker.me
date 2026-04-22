import type { MiddlewareHandler } from "astro";
import { negotiate, PRODUCES } from "./middleware/negotiate";
import {
  hasMarkdownRepresentation,
  resolveMarkdown,
} from "./middleware/sources";

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request } = context;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return next();
  }

  const { pathname } = context.url;
  const chosen = negotiate(request.headers.get("accept"), PRODUCES);

  if (chosen === "text/markdown") {
    const md = await resolveMarkdown(pathname);
    if (md !== null) {
      return new Response(request.method === "HEAD" ? null : md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          Vary: "Accept",
        },
      });
    }
  }

  const response = await next();
  if (hasMarkdownRepresentation(pathname)) {
    addVary(response.headers, "Accept");
  }
  return response;
};

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
