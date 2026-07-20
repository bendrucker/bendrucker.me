import type { APIContext } from "astro";

/**
 * A markdown representation of an HTML route, served to clients that ask for
 * `text/markdown`.
 */
export interface Representation {
  /** Astro route pattern, as reported by `APIContext.routePattern`. */
  route: string;
  /** Markdown for this request, or null when this request has none. */
  render(context: APIContext): Promise<string | null>;
}
