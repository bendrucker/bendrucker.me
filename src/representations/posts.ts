import { getCollection } from "astro:content";
import { writingPath } from "@/blog/path";
import { getSortedPosts, postFilter } from "@/blog/posts";
import { isEnabled } from "@/config";
import type { Representation } from "./types";

/** Each post as markdown at `/writing/<slug>`, listed once in `/llms.txt`. */
export const writing: Representation = {
  route: "/writing/[...slug]",
  section: "Writing",

  async render({ params }) {
    const slug = params.slug?.replace(/\/$/, "");
    if (!slug || !isEnabled("writing")) return null;

    const entries = await getCollection("blog", postFilter);
    const entry = entries.find(
      (post) => writingPath(post.id, post.filePath) === `/writing/${slug}`,
    );
    if (entry?.body == null) return null;
    return `# ${entry.data.title}\n\n${entry.body}`;
  },

  async list() {
    if (!isEnabled("writing")) return [];
    const entries = await getCollection("blog");
    return getSortedPosts(entries).map((post) => ({
      path: writingPath(post.id, post.filePath),
      title: post.data.title,
      description: post.data.description,
    }));
  },
};
