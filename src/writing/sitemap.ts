import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
// Relative, because `astro.config.ts` imports this before the `@` alias exists.
import { writingPath } from "../blog/path";

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
 * the collection's `**\/[^_]*.md` glob.
 */
export function writingSitemapPages(
  site: string,
  { root = ".", now = new Date() }: { root?: string; now?: Date } = {},
): string[] {
  const files = readdirSync(join(root, BLOG_PATH), { recursive: true })
    .map(String)
    .filter((file) => file.endsWith(".md") && !basename(file).startsWith("_"))
    .toSorted();

  return files
    .filter((file) =>
      published(readFileSync(join(root, BLOG_PATH, file), "utf8"), now),
    )
    .map((file) => {
      const id = file.replace(/\.md$/, "");
      const path = writingPath(id, `${BLOG_PATH}/${file}`);
      return new URL(path, site).href;
    });
}
