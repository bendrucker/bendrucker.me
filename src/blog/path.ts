import kebabcase from "lodash.kebabcase";

const BLOG_PATH = "src/content/blog";

/** A post's path below its section: `/<dirs>/<slug>`, with `_` directories left out. */
export function getPath(id: string, filePath: string | undefined) {
  const pathSegments = filePath
    ?.replace(BLOG_PATH, "")
    .split("/")
    .filter((path) => path !== "") // remove empty string in the segments ["", "other-path"] <- empty string will be removed
    .filter((path) => !path.startsWith("_")) // exclude directories start with underscore "_"
    .slice(0, -1) // remove the last segment_ file name_ since it's unnecessary
    .map((segment) => kebabcase(segment)); // slugify each segment path

  // Making sure `id` does not contain the directory
  const blogId = id.split("/");
  const slug = blogId.length > 0 ? blogId.slice(-1) : blogId;

  // If not inside the sub-dir, simply return the file path
  if (!pathSegments || pathSegments.length < 1) {
    return ["", slug].join("/");
  }

  return ["", ...pathSegments, slug].join("/");
}

/** A post's page under Writing: `/writing/<slug>`. */
export function writingPath(id: string, filePath: string | undefined) {
  return `/writing${getPath(id, filePath)}`;
}
