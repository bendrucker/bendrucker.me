import { describe, expect, it } from "vitest";
import { dayShuffle } from "@/activity/shuffle";
import { homeCredits, type CategoryId } from "@/categories";
import type { CodeRow } from "@/code/view";
import type { MediaRow } from "@/media/types";
import type { RideRow } from "@/rides/rows";
import type { PostRow } from "@/writing/rows";
import { homeCards, type HomeSources } from "./cards";

const NOW = new Date("2026-09-27T18:00:00Z");

function rides(count: number): RideRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    name: `Ride ${i}`,
    day: "2026-09-20",
    distanceM: 100_000,
    climbM: 1_000,
  }));
}

function media(count: number): MediaRow[] {
  return Array.from({ length: count }, (_, i) => ({
    key: `m${i}`,
    type: "Album",
    title: `Album ${i}`,
    day: "2026-09-01",
    url: "https://example.com",
    via: "Apple Music",
  }));
}

function posts(count: number): PostRow[] {
  return Array.from({ length: count }, (_, i) => ({
    href: `/writing/p${i}`,
    title: `Post ${i}`,
    tags: [],
    day: "2020-01-01",
    featured: true,
    minutes: 4,
  }));
}

function sources(overrides: Partial<HomeSources> = {}): HomeSources {
  return {
    rides: rides(7),
    code: [] satisfies CodeRow[],
    reading: media(2),
    writing: posts(4),
    watching: media(8),
    listening: media(6),
    ...overrides,
  };
}

const all = () => true;

describe("homeCards", () => {
  it("takes five from each category and six posters, in category order", () => {
    const cards = homeCards(sources(), NOW, all);

    expect(cards.map((c) => [c.id, c.items.length])).toEqual([
      ["rides", 5],
      ["reading", 2],
      ["writing", 4],
      ["watching", 6],
      ["listening", 5],
    ]);
  });

  it("hides a card with nothing to show", () => {
    const cards = homeCards(sources(), NOW, all);

    expect(cards.map((c) => c.id)).not.toContain("code");
  });

  it("leaves out a category that is off", () => {
    const off = new Set<CategoryId>(["reading", "watching", "listening"]);
    const cards = homeCards(sources(), NOW, (id) => !off.has(id));

    expect(cards.map((c) => c.id)).toEqual(["rides", "writing"]);
    expect(homeCredits(cards.map((c) => c.id))).toEqual([]);
  });

  it("orders the listening shelf by the day, from its five highlights", () => {
    const shelf = media(6);
    const [listening] = homeCards(
      sources({ listening: shelf }),
      NOW,
      (id) => id === "listening",
    );

    expect(listening?.items).toEqual(dayShuffle(shelf.slice(0, 5), NOW));
    expect(
      homeCards(sources({ listening: shelf }), NOW, (id) => id === "listening"),
    ).toEqual([listening]);
  });

  it("keeps the other cards in their route's order", () => {
    const [ridesCard] = homeCards(sources(), NOW, (id) => id === "rides");

    expect(ridesCard?.id).toBe("rides");
    expect(ridesCard?.items).toEqual(sources().rides.slice(0, 5));
  });
});
