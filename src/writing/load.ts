import { getCollection, type CollectionEntry } from "astro:content";
import { getPath } from "@/blog/path";
import { postFilter } from "@/blog/posts";
import { SITE } from "@/config";
import { localDay, postRows, type PostRow } from "./rows";

export interface Writing {
  entries: CollectionEntry<"blog">[];
  rows: PostRow[];
  /** The current year where the site is, which dates leave unsaid. */
  thisYear: string;
}

/** The published posts, as entries and as the rows the list draws. */
export async function loadWriting(now = new Date()): Promise<Writing> {
  const entries = await getCollection("blog", postFilter);
  return {
    entries,
    rows: postRows(entries, {
      href: (post) => getPath(post.id),
      timeZone: SITE.timezone,
    }),
    thisYear: localDay(now, SITE.timezone).slice(0, 4),
  };
}
