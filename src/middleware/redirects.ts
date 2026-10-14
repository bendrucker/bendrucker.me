import type { MiddlewareHandler } from "astro";

const TAG_PATH = /^\/tags(?:\/([^/]+))?(?:\/.*)?$/;

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Where an old `/tags` URL lives now: the tag index moves to `/writing`, and a
 * tag's pages, paginated or not, to `/writing?tag=<tag>`. Every other path
 * returns undefined. `astro.config.ts` holds the static redirects, and this one
 * is here because a redirect config can't write a query string.
 */
export function tagRedirect(pathname: string): string | undefined {
  const match = TAG_PATH.exec(pathname);
  if (!match) return undefined;

  const [, tag] = match;
  if (!tag) return "/writing/";
  return `/writing/?${new URLSearchParams({ tag: decode(tag) }).toString()}`;
}

export const redirects: MiddlewareHandler = async (context, next) => {
  const { method } = context.request;
  if (method !== "GET" && method !== "HEAD") return next();

  const location = tagRedirect(context.url.pathname);
  return location ? context.redirect(location, 301) : next();
};
