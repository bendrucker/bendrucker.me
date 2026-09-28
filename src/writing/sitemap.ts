import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { slug } from "github-slugger";
// Relative, because `astro.config.ts` imports this before the `@` alias exists.
import { getPath } from "../blog/path";

const BLOG_PATH = "src/content/blog";

/** A frontmatter field's raw value, read without a YAML parser. */
function field(source: string, name: string): string | undefined {
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? "";
  const pattern = new RegExp(`^${name}:\\s*(.+?)\\s*$`, "m");
  return pattern.exec(frontmatter)?.[1];
}

function published(source: string, now: Date): boolean {
  if (field(source, "draft") === "true") return false;
  const date = new Date(field(source, "pubDatetime") ?? "");
  return !Number.isNaN(date.getTime()) && date <= now;
}

/**
 * Every published post's `/writing/<slug>` URL. The sitemap integration only
 * finds routes it can enumerate, and a post page renders on demand, so the
 * posts are read from the collection's files here. The file selection mirrors
 * the collection's glob, which leaves out any `_` file or directory.
 */
export function writingSitemapPages(
  site: string,
  { root = ".", now = new Date() }: { root?: string; now?: Date } = {},
): string[] {
  const files = readdirSync(join(root, BLOG_PATH), { recursive: true })
    .map(String)
    .filter(
      (file) =>
        file.endsWith(".md") &&
        !file.split("/").some((segment) => segment.startsWith("_")),
    )
    .toSorted();

  return files
    .map((file) => ({
      file,
      source: readFileSync(join(root, BLOG_PATH, file), "utf8"),
    }))
    .filter(({ source }) => published(source, now))
    .map(({ file, source }) => {
      // The glob loader's id: a frontmatter `slug`, else each segment slugged.
      const id =
        field(source, "slug") ??
        file
          .replace(/\.md$/, "")
          .split("/")
          .map((segment) => slug(segment))
          .join("/");
      return new URL(getPath(id), site).href;
    });
}
