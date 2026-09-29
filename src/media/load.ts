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

/**
 * A media route's rows, newest first, and every key in rank order. The route
 * and the home card each take as many highlights as they have room for.
 */
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

/**
 * A show's season lists under every month it was watched in, dated to the
 * last watch that month. Only the latest carries the meter, so the in-progress
 * filter finds each season once.
 */
function watchingRows(key: string, item: WatchingItem): MediaRow[] {
  const base = watchingBase(key, item);
  const byMonth = new Map<string, string>();
  for (const day of item.watchedDays ?? []) {
    const month = day.slice(0, 7);
    if (month !== item.day.slice(0, 7) && day > (byMonth.get(month) ?? "")) {
      byMonth.set(month, day);
    }
  }
  return [
    { ...base, ...progress(item) },
    ...[...byMonth].map(([month, day]) => ({
      ...base,
      key: `${key}-${month}`,
      day,
    })),
  ];
}

function watchingBase(key: string, item: WatchingItem): MediaRow {
  return {
    ...common(key, item),
    ...(item.art !== undefined && { art: item.art }),
    ...(item.season !== undefined && {
      text: `Season ${item.season}`,
      season: item.season,
    }),
  };
}

/**
 * A finished season has nothing left to track, so only one in progress is
 * active and carries a meter.
 */
function progress({ episodes }: WatchingItem): Partial<MediaRow> {
  if (!episodes || episodes.watched >= episodes.aired) return {};
  return {
    active: true,
    ticks: episodeTicks(episodes.watched, episodes.aired),
    tickLabel: tickLabel(episodes.watched, episodes.aired),
  };
}

function listeningRow(key: string, item: ListeningItem): MediaRow {
  return {
    ...common(key, item),
    ...(item.art !== undefined && { art: item.art }),
    ...(item.label !== undefined && { label: item.label }),
  };
}

function feed<T>(
  items: readonly T[],
  rank: (items: readonly T[]) => T[],
  rows: (key: string, item: T) => MediaRow | MediaRow[],
): MediaFeed {
  const keys = new Map(items.map((item, i) => [item, `m${i}`]));
  return {
    rows: items
      .flatMap((item) => rows(keys.get(item)!, item))
      .toSorted((a, b) => b.day.localeCompare(a.day)),
    highlightKeys: rank(items).map((item) => keys.get(item)!),
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
    return feed(await loadWatching(), rankWatching, watchingRows);
  }
  return feed(await loadListening(), rankListening, listeningRow);
}
