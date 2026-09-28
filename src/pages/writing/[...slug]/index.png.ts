import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { getPath } from "@/blog/path";
import { isEnabled, SITE } from "@/config";
import { generateOgImageForPost } from "@/og/generate";

export const prerender = true;

export async function getStaticPaths() {
  if (!SITE.dynamicOgImage || !isEnabled("writing")) {
    return [];
  }

  const entries = await getCollection("blog");
  const posts = entries.filter(({ data }) => !data.draft && !data.ogImage);

  return posts.map((post) => ({
    params: { slug: getPath(post.id, post.filePath) },
    props: post,
  }));
}

export const GET: APIRoute<CollectionEntry<"blog">> = async ({ props }) =>
  new Response(await generateOgImageForPost(props), {
    headers: { "Content-Type": "image/png" },
  });
