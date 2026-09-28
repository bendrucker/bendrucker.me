import type { APIRoute } from "astro";

/**
 * A year of the old code index, which `/code` replaced. The param carries a
 * `.md` suffix from the year's Markdown, which moves to `/code.md`.
 */
export const ALL: APIRoute = ({ params, redirect }) =>
  redirect(params.year?.endsWith(".md") ? "/code.md" : "/code", 301);
