import { getCollection } from "astro:content";
import { getPath, writingPath } from "@/blog/path";
import { getSortedPosts, postFilter } from "@/blog/posts";
import { isEnabled } from "@/config";
import type { Representation } from "./types";

type PathOf = (id: string, filePath: string | undefined) => string;

/**
 * Posts as markdown at one base path. `listed` puts them in `/llms.txt`, which
 * names each post once, at the path it lives at now.
 */
function postsAt(
  base: string,
  pathOf: PathOf,
  { listed }: { listed: boolean },
): Representation {
  return {
    route: `${base}/[...slug]`,
    section: "Writing",

    async render({ params }) {
      const slug = params.slug?.replace(/\/$/, "");
      if (!slug || !isEnabled("writing")) return null;

      const entries = await getCollection("blog", postFilter);
      const entry = entries.find(
        (post) => pathOf(post.id, post.filePath) === `${base}/${slug}`,
      );
      if (entry?.body == null) return null;
      return `# ${entry.data.title}\n\n${entry.body}`;
    },

    async list() {
      if (!listed || !isEnabled("writing")) return [];
      const entries = await getCollection("blog");
      return getSortedPosts(entries).map((post) => ({
        path: pathOf(post.id, post.filePath),
        title: post.data.title,
        description: post.data.description,
      }));
    },
  };
}

export const writing = postsAt("/writing", writingPath, { listed: true });

/** The old `/posts` twins, kept serving until they redirect to Writing. */
export const posts = postsAt("/posts", getPath, { listed: false });
