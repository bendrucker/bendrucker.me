export const prerender = true;

import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getPath } from "@/blog/path";
import { getSortedPosts } from "@/blog/posts";
import { isEnabled, SITE } from "@/config";

/**
 * The guid each post was first published under, when posts lived at
 * `/posts/<id>/`. A reader keys an item on its guid, so a new one would hand
 * every subscriber the whole archive again. That address still redirects to
 * the post, so it stays a permalink.
 */
function guid(id: string): string {
  const url = new URL(`/posts/${id}/`, SITE.website).href;
  return `<guid isPermaLink="true">${url}</guid>`;
}

export async function GET() {
  const posts = isEnabled("writing")
    ? getSortedPosts(await getCollection("blog"))
    : [];
  return rss({
    title: SITE.title,
    description: SITE.desc,
    site: SITE.website,
    items: posts.map(({ data, id }) => ({
      link: getPath(id),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
      customData: guid(id),
    })),
  });
}
