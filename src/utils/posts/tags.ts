import type { CollectionEntry } from "astro:content";
import getSortedPosts from "./sort";
import { slugifyAll, slugifyStr } from "../text/slugify";
import postFilter from "./filter";

export const getPostsByTag = (posts: CollectionEntry<"blog">[], tag: string) =>
  getSortedPosts(posts.filter(post => slugifyAll(post.data.tags).includes(tag)));

type Tag = {
  tag: string;
  tagName: string;
};

export const getUniqueTags = (posts: CollectionEntry<"blog">[]) =>
  posts
    .filter(postFilter)
    .flatMap(post => post.data.tags)
    .map(tag => ({ tag: slugifyStr(tag), tagName: tag }))
    .filter(
      (value, index, self) =>
        self.findIndex(tag => tag.tag === value.tag) === index
    )
    .sort((tagA, tagB) => tagA.tag.localeCompare(tagB.tag));