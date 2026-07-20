import type { APIRoute } from "astro";
import type { Representation } from "./types";

export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

/** Serves a representation at its `.md` sibling route. */
export function markdownEndpoint(representation: Representation): APIRoute {
  return async (context) => {
    const md = await representation.render(context);
    if (md === null) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(context.request.method === "HEAD" ? null : md, {
      headers: { "Content-Type": MARKDOWN_CONTENT_TYPE },
    });
  };
}
