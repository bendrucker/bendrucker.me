// What home shows: a card per category that is on and has something to show,
// each holding the first highlights of its route in the route's own order.
// Every card carries five, except Watching, whose narrow posters fit six
// across a desktop card. A list card rests at a peek height and keeps the rows
// past it in a drawer, so a phone carries all five too. A shelf lays its art
// out in one row, which a phone's width fits three of, so the page hides the
// rest there, since the server can't know the width it renders for.
import { HIGHLIGHTS } from "@/activity/highlights";
import { dayShuffle } from "@/activity/shuffle";
import { enabledCategories, type CategoryId } from "@/categories";
import type { CodeRow } from "@/code/view";
import { isEnabled } from "@/config";
import type { MediaRow } from "@/media/types";
import type { RideRow } from "@/rides/rows";
import type { PostRow } from "@/writing/rows";

/** Highlights a card carries, and how many of a shelf's a phone shows. */
export const HOME_ROWS = {
  card: HIGHLIGHTS.desktop,
  posters: 6,
  phoneShelf: HIGHLIGHTS.phone,
} as const;

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

/** A category's card with its first highlights, or the day's order for Listening. */
function cardFor(id: CategoryId, sources: HomeSources, now: Date): HomeCard {
  const top = <T>(items: readonly T[]) => items.slice(0, HOME_ROWS.card);
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
      return { id, items: sources.watching.slice(0, HOME_ROWS.posters) };
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
