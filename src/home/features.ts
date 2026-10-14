// The Rides and Code cards lead with one feature: the top highlight, drawn a
// little larger than the rows that follow it. Only the work Ben does gets one,
// so the cards for what he makes stand taller than the ones for what he reads,
// watches, and listens to.
import type { RideDetail } from "@/activity/feed";
import type { CodeRepo } from "@/code/types";
import type { CodeRow } from "@/code/view";
import type { RideRow } from "@/rides/rows";
import type { HomeCard } from "./cards";

export interface RideFeature {
  ride: RideRow;
  /** The track as an encoded polyline, when the ride has one to draw. */
  route?: string;
  /** The ride's first four photos, as square thumbnails. Videos are passed over. */
  photos: { url: string; alt: string }[];
}

export interface CodeFeature {
  row: CodeRow;
  /** The title of the newest pull request in the window that wasn't abandoned. */
  latest?: string;
}

export interface HomeFeatures {
  rides?: RideFeature;
  code?: CodeFeature;
}

/** The top ride, with the track and photos its page would show, when they loaded. */
export function rideFeature(
  ride: RideRow,
  detail: RideDetail | null,
): RideFeature {
  const photos = (detail?.ride.media ?? [])
    .filter((item) => item.kind === "photo")
    .slice(0, 4)
    .map((item) => ({ url: item.thumbnailUrl, alt: item.alt }));
  return { ride, route: detail?.ride.route, photos };
}

/**
 * The top repository or project, with what was done there lately: the title
 * of its newest pull request, open or merged. A project reads across its
 * repositories. Drafts and closed pull requests are skipped, since neither is
 * work that landed.
 */
export function codeFeature(
  row: CodeRow,
  repos: readonly CodeRepo[],
): CodeFeature {
  const keys = new Set(
    row.members.length > 0
      ? row.members.map((member) => member.key)
      : [row.key],
  );
  const pulls = repos
    .filter((repo) => keys.has(repo.repo))
    .flatMap((repo) => repo.pulls)
    .filter((pull) => pull.state !== "CLOSED" && !pull.isDraft)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { row, latest: pulls[0]?.title };
}

/** The cards with each featured item taken out of the rows beneath it. */
export function withoutFeatured(
  cards: readonly HomeCard[],
  features: HomeFeatures,
): HomeCard[] {
  return cards.map((card) => {
    if (card.id === "rides" && features.rides) {
      return { ...card, items: card.items.slice(1) };
    }
    if (card.id === "code" && features.code) {
      return { ...card, items: card.items.slice(1) };
    }
    return card;
  });
}
