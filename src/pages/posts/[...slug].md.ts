import type { GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/blog/posts";
import { markdownEndpoint, posts } from "@/representations";

export const prerender = true;

export const getStaticPaths = (async () => {
  const entries = getSortedPosts(await getCollection("blog"));

  return entries.map((post) => ({
    params: { slug: post.id },
  }));
}) satisfies GetStaticPaths;

export const GET = markdownEndpoint(posts);
