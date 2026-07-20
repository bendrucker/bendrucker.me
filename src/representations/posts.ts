import { getCollection } from "astro:content";
import { getPath } from "@/blog/path";
import { postFilter } from "@/blog/posts";
import type { Representation } from "./types";

export const posts: Representation = {
  route: "/posts/[...slug]",
  async render({ params }) {
    const slug = params.slug?.replace(/\/$/, "");
    if (!slug) return null;

    const entries = await getCollection("blog", postFilter);
    const entry = entries.find(
      (post) => getPath(post.id, post.filePath) === `/posts/${slug}`,
    );
    return entry?.body ?? null;
  },
};
