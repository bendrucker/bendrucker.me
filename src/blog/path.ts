import kebabcase from "lodash.kebabcase";

const BLOG_PATH = "src/content/blog";

/**
 * Slug of a blog post: its directories under `src/content/blog` followed by its
 * file name, slugified, with no leading or trailing slash. This is the value
 * the `[...slug]` rest param takes.
 *
 * @param id - id of the blog post
 * @param filePath - the blog post full file location
 */
export function getSlug(id: string, filePath: string | undefined): string {
  const directories =
    filePath
      ?.replace(BLOG_PATH, "")
      .split("/")
      .filter((segment) => segment !== "")
      .filter((segment) => !segment.startsWith("_")) // exclude "_drafts" and friends
      .slice(0, -1) // drop the file name, which `id` supplies
      .map((segment) => kebabcase(segment)) ?? [];

  const name = id.split("/").at(-1) ?? id;

  return [...directories, name].join("/");
}

/**
 * Canonical site path of a blog post. Carries the trailing slash `trailingSlash:
 * "always"` canonicalizes on, so a link built from this reaches the post without
 * a redirect.
 *
 * @param id - id of the blog post
 * @param filePath - the blog post full file location
 */
export function getPath(id: string, filePath: string | undefined): string {
  return `/posts/${getSlug(id, filePath)}/`;
}
