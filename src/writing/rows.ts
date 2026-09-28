/**
 * Writing's view model: the posts as dated rows, the tags they filter by, the
 * featured highlights, and the neighbors a post links to. It reads the fields
 * the content collection supplies, so it runs without `astro:content`.
 */
import kebabcase from "lodash.kebabcase";
import { matches } from "@/activity/search";
import { groupRows, monthShort, type GroupedRow } from "@/activity/sections";

/** The parts of a blog collection entry a row is built from. */
export interface PostSource {
  id: string;
  filePath?: string;
  data: {
    title: string;
    description: string;
    pubDatetime: Date;
    tags: string[];
    featured?: boolean;
    timezone?: string;
  };
}

export interface PostTag {
  name: string;
  /** The tag in a URL: `?tag=open-source`. */
  slug: string;
}

export interface PostRow {
  href: string;
  title: string;
  /** The description, dropped where it only repeats the title. */
  text?: string;
  tags: PostTag[];
  /** The local calendar day it was published, `YYYY-MM-DD`. */
  day: string;
  featured: boolean;
}

/** Highlights on a desktop. A phone shows the first three, hiding the rest in CSS. */
export const HIGHLIGHT_COUNT = 5;

export function tagSlug(name: string): string {
  return kebabcase(name);
}

/** A date's calendar day in a time zone, `YYYY-MM-DD`. */
export function localDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export interface RowOptions {
  /** Where a post lives, given its collection entry. */
  href: (post: PostSource) => string;
  /** The zone a post without its own is dated in. */
  timeZone: string;
}

/** Every post as a row, newest first by publication. */
export function postRows(
  posts: readonly PostSource[],
  { href, timeZone }: RowOptions,
): PostRow[] {
  return posts
    .toSorted(
      (a, b) => b.data.pubDatetime.getTime() - a.data.pubDatetime.getTime(),
    )
    .map((post) => {
      const { title, description, tags, featured, timezone } = post.data;
      return {
        href: href(post),
        title,
        ...(description.trim() !== title.trim() && { text: description }),
        tags: tags.map((name) => ({ name, slug: tagSlug(name) })),
        day: localDay(post.data.pubDatetime, timezone ?? timeZone),
        featured: featured === true,
      };
    });
}

/** Every tag a post carries, once each, by name. */
export function postTags(rows: readonly PostRow[]): PostTag[] {
  const bySlug = new Map<string, PostTag>();
  for (const tag of rows.flatMap((row) => row.tags)) {
    if (!bySlug.has(tag.slug)) bySlug.set(tag.slug, tag);
  }
  return [...bySlug.values()].toSorted((a, b) => a.name.localeCompare(b.name));
}

/**
 * The tag a `?tag` parameter names. It takes the slug the old `/tags/<slug>`
 * pages used as well as the name itself, so `open-source` and `Open Source`
 * both find it.
 */
export function findTag(
  tags: readonly PostTag[],
  param: string | null | undefined,
): PostTag | undefined {
  if (!param) return undefined;
  const slug = tagSlug(param);
  return tags.find((tag) => tag.slug === slug);
}

export function hasTag(row: PostRow, tag: PostTag | undefined): boolean {
  return tag === undefined || row.tags.some((t) => t.slug === tag.slug);
}

/** The featured posts, newest first. */
export function highlightRows(rows: readonly PostRow[]): PostRow[] {
  return rows.filter((row) => row.featured).slice(0, HIGHLIGHT_COUNT);
}

export interface WritingFilter {
  query: string;
  tag?: PostTag;
}

/** A row the page renders, and whether the search leaves it showing. */
export interface ListRow extends GroupedRow<PostRow> {
  shown: boolean;
}

export interface ListWeek {
  key: string;
  rows: ListRow[];
  shown: boolean;
}

export interface ListSection {
  key: string;
  label: string;
  weeks: ListWeek[];
  shown: boolean;
}

export interface WritingView {
  /**
   * The featured posts, which a tag drops. A search only hides them, as it
   * hides the rows it doesn't match, so clearing it in the page brings them
   * back without a request.
   */
  highlights: ListRow[];
  /** The posts the tag keeps, by year. */
  sections: ListSection[];
  /** How many rows the search and tag leave showing. */
  count: number;
}

export function writingView(
  rows: readonly PostRow[],
  { query, tag }: WritingFilter,
  thisYear: string,
): WritingView {
  const tagged = rows.filter((row) => hasTag(row, tag));
  const sections = groupRows(tagged, "year", { thisYear }).map((section) => {
    const weeks = section.weeks.map((week) => {
      const listed = week.rows.map((row) => ({
        ...row,
        shown: matches(row.item, query),
      }));
      return { ...week, rows: listed, shown: listed.some((r) => r.shown) };
    });
    return { ...section, weeks, shown: weeks.some((w) => w.shown) };
  });

  const searching = query.trim() !== "";
  const highlights = tag
    ? []
    : highlightRows(rows).map((item) => ({
        item,
        showDay: true,
        dayNum: String(Number(item.day.slice(8, 10))),
        // Highlights span months, so the gutter says which.
        sub: monthShort(item.day),
        shown: !searching,
      }));

  return {
    highlights,
    sections,
    count: sections
      .flatMap((s) => s.weeks.flatMap((w) => w.rows))
      .filter((r) => r.shown).length,
  };
}

export interface Neighbors {
  newer?: PostRow;
  older?: PostRow;
}

/** The posts either side of one, in the order the list shows them. */
export function neighbors(rows: readonly PostRow[], href: string): Neighbors {
  const i = rows.findIndex((row) => row.href === href);
  if (i === -1) return {};
  return {
    ...(i > 0 && { newer: rows[i - 1] }),
    ...(i < rows.length - 1 && { older: rows[i + 1] }),
  };
}

/** A post's date over its title: "Wednesday, February 19, 2014", without the year when it's this one. */
export function fullDate(day: string, thisYear: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(day.slice(0, 4) !== thisYear && { year: "numeric" }),
  }).format(new Date(`${day}T12:00:00Z`));
}

/** The view transition name a post's row and its title share, so one grows into the other. */
export function transitionName(href: string): string {
  return `post-${href.replace(/^\/writing\//, "").replaceAll("/", "-")}`;
}
