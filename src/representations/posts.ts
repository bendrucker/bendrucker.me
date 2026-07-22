import { getCollection } from "astro:content";
import { getPath } from "@/blog/path";
import { getSortedPosts, postFilter } from "@/blog/posts";
import type { Representation } from "./types";

export const posts: Representation = {
  route: "/posts/[...slug]",
  section: "Posts",

  async render({ params }) {
    const slug = params.slug?.replace(/\/$/, "");
    if (!slug) return null;

    const entries = await getCollection("blog", postFilter);
    const entry = entries.find(
      (post) => getPath(post.id, post.filePath) === `/posts/${slug}`,
    );
    if (entry?.body === undefined) return null;
    return `# ${entry.data.title}\n\n${entry.body}`;
  },

  async list() {
    const entries = await getCollection("blog");
    return getSortedPosts(entries).map((post) => ({
      path: getPath(post.id, post.filePath),
      title: post.data.title,
      description: post.data.description,
    }));
  },
};
