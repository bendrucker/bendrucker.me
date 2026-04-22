import { getCollection } from "astro:content";
import { getPath } from "@/utils/posts/path";
import postFilter from "@/utils/posts/filter";
import aboutMd from "../pages/about.md?raw";

function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function hasMarkdownRepresentation(pathname: string): boolean {
  const path = stripTrailingSlash(pathname);
  return path === "/about" || path.startsWith("/posts/");
}

export async function resolveMarkdown(
  pathname: string,
): Promise<string | null> {
  const path = stripTrailingSlash(pathname);

  if (path === "/about") {
    return aboutMd;
  }

  if (path.startsWith("/posts/")) {
    const posts = await getCollection("blog", postFilter);
    const entry = posts.find((p) => getPath(p.id, p.filePath) === path);
    return entry?.body ?? null;
  }

  return null;
}
