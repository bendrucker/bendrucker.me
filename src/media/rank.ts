import type { ListeningItem, ReadingItem, WatchingItem } from "./types";

/*
 * Which items lead each route, in order. Each takes the loader's items newest
 * first and returns them ranked, and the route keeps the first five.
 */

/** Anything with your own note first, then books, each newest first. */
export function rankReading<T extends ReadingItem>(items: readonly T[]): T[] {
  return items
    .filter((item) => item.note !== undefined || item.type === "Book")
    .toSorted(
      (a, b) =>
        Number(b.note !== undefined) - Number(a.note !== undefined) ||
        b.day.localeCompare(a.day),
    );
}

/** The latest watched. */
export function rankWatching<T extends WatchingItem>(items: readonly T[]): T[] {
  return items.toSorted((a, b) => b.day.localeCompare(a.day));
}

/** The most played. */
export function rankListening<T extends ListeningItem>(
  items: readonly T[],
): T[] {
  return items.toSorted(
    (a, b) => b.plays - a.plays || b.day.localeCompare(a.day),
  );
}
