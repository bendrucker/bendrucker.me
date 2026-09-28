// What home shows: a card per category that is on and has something to show,
// each holding the first highlights of its route in the route's own order.
// Every card carries five, and the page hides the last two below the desktop
// breakpoint, since the server can't know the width it renders for.
import { dayShuffle } from "@/activity/shuffle";
import { enabledCategories, type CategoryId } from "@/categories";
import type { CodeRow } from "@/code/view";
import { isEnabled } from "@/config";
import type { MediaRow } from "@/media/types";
import type { RideRow } from "@/rides/rows";
import type { PostRow } from "@/writing/rows";

/** Highlights a card shows: three on a phone, five from the desktop breakpoint up. */
export const HOME_ROWS = { phone: 3, desktop: 5 } as const;

/** Each category's highlights, ranked the way its route ranks them. */
export interface HomeSources {
  rides: RideRow[];
  code: CodeRow[];
  reading: MediaRow[];
  writing: PostRow[];
  watching: MediaRow[];
  listening: MediaRow[];
}

export type HomeCard = {
  [K in CategoryId]: { id: K; items: HomeSources[K] };
}[CategoryId];

/** Whether the row at this index shows only from the desktop breakpoint up. */
export function desktopOnly(index: number): boolean {
  return index >= HOME_ROWS.phone;
}

/** A category's card with its first five, or the day's order for the shelf. */
function cardFor(id: CategoryId, sources: HomeSources, now: Date): HomeCard {
  const top = <T>(items: readonly T[]) => items.slice(0, HOME_ROWS.desktop);
  switch (id) {
    case "rides":
      return { id, items: top(sources.rides) };
    case "code":
      return { id, items: top(sources.code) };
    case "reading":
      return { id, items: top(sources.reading) };
    case "writing":
      return { id, items: top(sources.writing) };
    case "watching":
      return { id, items: top(sources.watching) };
  }
  return { id, items: dayShuffle(top(sources.listening), now) };
}

/**
 * The cards in category order. A category that is off has no card, and one
 * with nothing in its window hides rather than showing an empty frame. The
 * Listening shelf takes its five in the day's order, which `now` seeds.
 */
export function homeCards(
  sources: HomeSources,
  now: Date,
  enabled: (id: CategoryId) => boolean = isEnabled,
): HomeCard[] {
  return enabledCategories(enabled)
    .map(({ id }) => cardFor(id, sources, now))
    .filter((card) => card.items.length > 0);
}
