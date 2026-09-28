import { loadListening } from "@/fixtures/listening";
import { loadReading } from "@/fixtures/reading";
import { loadWatching } from "@/fixtures/watching";
import { rankListening, rankReading, rankWatching } from "./rank";
import { episodeTicks, tickLabel } from "./ticks";
import type {
  ListeningItem,
  MediaCategory,
  MediaRow,
  ReadingItem,
  WatchingItem,
} from "./types";
import { HIGHLIGHTS } from "./view";

/** A media route's rows, newest first, and the keys of its highlights in rank order. */
export interface MediaFeed {
  rows: MediaRow[];
  highlightKeys: string[];
}

function common(key: string, item: ReadingItem | WatchingItem | ListeningItem) {
  return {
    key,
    type: item.type,
    title: item.title,
    day: item.day,
    url: item.url,
    via: item.via,
    ...(item.text !== undefined && { text: item.text }),
    ...(item.note !== undefined && { note: item.note }),
  };
}

function watchingRow(key: string, item: WatchingItem): MediaRow {
  return {
    ...common(key, item),
    art: item.art,
    ...(item.episodes && {
      ticks: episodeTicks(item.episodes.watched, item.episodes.aired),
      tickLabel: tickLabel(item.episodes.watched, item.episodes.aired),
    }),
  };
}

function listeningRow(key: string, item: ListeningItem): MediaRow {
  return {
    ...common(key, item),
    art: item.art,
    ...(item.label !== undefined && { label: item.label }),
  };
}

function feed<T>(
  items: readonly T[],
  rank: (items: readonly T[]) => T[],
  row: (key: string, item: T) => MediaRow,
): MediaFeed {
  const keys = new Map(items.map((item, i) => [item, `m${i}`]));
  return {
    rows: items.map((item) => row(keys.get(item)!, item)),
    highlightKeys: rank(items)
      .slice(0, HIGHLIGHTS.desktop)
      .map((item) => keys.get(item)!),
  };
}

/** Loads a media route and applies its category's rules. */
export async function loadMediaFeed(
  category: MediaCategory,
): Promise<MediaFeed> {
  if (category === "reading") {
    return feed(await loadReading(), rankReading, common);
  }
  if (category === "watching") {
    return feed(await loadWatching(), rankWatching, watchingRow);
  }
  return feed(await loadListening(), rankListening, listeningRow);
}
