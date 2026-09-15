import { getCollection } from "astro:content";
import { getSortedPosts, postFilter } from "@/blog/posts";
import type { Representation } from "./types";

export const posts: Representation = {
  route: "/posts/[...slug]",
  section: "Posts",

  async render({ params }) {
    const slug = params.slug?.replace(/\/$/, "");
    if (!slug) return null;

    const entries = await getCollection("blog", postFilter);
    const entry = entries.find((post) => post.id === slug);
    if (entry?.body == null) return null;
    return `# ${entry.data.title}\n\n${entry.body}`;
  },

  async list() {
    const entries = await getCollection("blog");
    return getSortedPosts(entries).map((post) => ({
      // `/llms.txt` appends `.md` to this, so it carries no trailing slash.
      path: `/posts/${post.id}`,
      title: post.data.title,
      description: post.data.description,
    }));
  },
};
