import type { CollectionEntry } from "astro:content";
import kebabcase from "lodash.kebabcase";
import { getSortedPosts, postFilter } from "./posts";

export const getPostsByTag = (posts: CollectionEntry<"blog">[], tag: string) =>
  getSortedPosts(
    posts.filter((post) => post.data.tags.map(kebabcase).includes(tag)),
  );

type Tag = {
  tag: string;
  tagName: string;
};

export const getUniqueTags = (posts: CollectionEntry<"blog">[]) =>
  posts
    .filter(postFilter)
    .flatMap((post) => post.data.tags)
    .map((tag): Tag => ({ tag: kebabcase(tag), tagName: tag }))
    .filter(
      (value, index, self) =>
        self.findIndex((tag) => tag.tag === value.tag) === index,
    )
    .toSorted((tagA, tagB) => tagA.tag.localeCompare(tagB.tag));
