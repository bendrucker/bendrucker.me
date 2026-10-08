import { ALBUM, PODCAST, POSTER } from "@/components/parts/fixtures";
import { loadMediaFeed, type MediaFeed } from "@/media/load";
import type { MediaCategory, MediaRow } from "@/media/types";
import type { StoryControl } from "@/stories/controls";

/** The three media routes, for a story that switches between them. */
export const mediaControl: StoryControl = {
  type: "select",
  title: "category",
  options: { reading: "Reading", watching: "Watching", listening: "Listening" },
};

export function mediaCategory(value: unknown): MediaCategory {
  return value === "watching" || value === "listening" ? value : "reading";
}

function standIn(row: MediaRow): MediaRow {
  if (row.art === undefined) return row;
  if (row.type === "Podcast") return { ...row, art: PODCAST };
  if (row.type === "Album") return { ...row, art: ALBUM };
  return { ...row, art: POSTER };
}

/**
 * A route's feed from its fixtures, with the artwork swapped for generated
 * stand-ins so the story book carries only artwork of our own.
 */
export async function storyFeed(id: MediaCategory): Promise<MediaFeed> {
  const feed = await loadMediaFeed(id);
  return { ...feed, rows: feed.rows.map(standIn) };
}

/** Every route's feed, loaded once for a story's state. */
export async function storyFeeds(): Promise<Record<MediaCategory, MediaFeed>> {
  const [reading, watching, listening] = await Promise.all([
    storyFeed("reading"),
    storyFeed("watching"),
    storyFeed("listening"),
  ]);
  return { reading, watching, listening };
}

/** The feed's highlights in rank order, all shown whatever the width. */
export function storyHighlights(feed: MediaFeed, count: number): MediaRow[] {
  const byKey = new Map(feed.rows.map((row) => [row.key, row]));
  return feed.highlightKeys
    .slice(0, count)
    .flatMap((key) => byKey.get(key) ?? []);
}

export const STORY_YEAR = String(new Date().getFullYear());
