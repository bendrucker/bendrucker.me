import { SITE } from "@/config";

/**
 * Canonical site path of a blog post, carrying whichever trailing slash
 * `astro.config.ts` canonicalizes on, so a link built from this reaches the
 * post without a redirect.
 */
export function getPath(id: string): string {
  const slash = SITE.trailingSlash === "always" ? "/" : "";
  return `/posts/${id}${slash}`;
}
