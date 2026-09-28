export const prerender = true;

import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { writingPath } from "@/blog/path";
import { getSortedPosts } from "@/blog/posts";
import { isEnabled, SITE } from "@/config";

export async function GET() {
  const posts = isEnabled("writing")
    ? getSortedPosts(await getCollection("blog"))
    : [];
  return rss({
    title: SITE.title,
    description: SITE.desc,
    site: SITE.website,
    items: posts.map(({ data, id, filePath }) => ({
      link: writingPath(id, filePath),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
    })),
  });
}
