import type { APIRoute } from "astro";

/** A year of the old code index, which `/code` replaced. */
export const ALL: APIRoute = ({ redirect }) => redirect("/code", 301);
