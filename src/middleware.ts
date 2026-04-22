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
  response.headers.append("Vary", "Accept");
  return response;
};
