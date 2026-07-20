import type { APIContext } from "astro";

/** One markdown document, as advertised in `/llms.txt`. */
export interface RepresentationEntry {
  /** Page path without the `.md` suffix, e.g. `/posts/going-all-in`. */
  path: string;
  title: string;
  description?: string;
}

/**
 * A markdown representation of an HTML route, served to clients that ask for
 * `text/markdown` and at the route's `.md` sibling.
 */
export interface Representation {
  /** Astro route pattern, as reported by `APIContext.routePattern`. */
  route: string;
  /** Heading this representation's entries are listed under in `/llms.txt`. */
  section: string;
  /** Markdown for this request, or null when this request has none. */
  render(context: APIContext): Promise<string | null>;
  /** Every document this representation can serve. */
  list(): Promise<RepresentationEntry[]>;
}
