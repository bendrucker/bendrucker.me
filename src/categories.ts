import { isEnabled, type CategoryId } from "@/config";

export type { CategoryId } from "@/config";

/** Credits name only what a page shows. */
const CREDIT_LINES = {
  maps: "Maps © CARTO, © OpenStreetMap contributors.",
  posters: "Posters from TVmaze and Wikipedia.",
  covers: "Covers from Apple and the Cover Art Archive.",
} as const;

export type Credit = keyof typeof CREDIT_LINES;

const CREDIT_ORDER: readonly Credit[] = ["maps", "posters", "covers"];

export interface CategoryType {
  /** A row's `type`, or `ACTIVE`, which picks shows mid-season instead. */
  value: string;
  label: string;
}

export interface Category {
  id: CategoryId;
  /** The heading: a route's title and a home card's name. */
  name: string;
  /** What its rows are, for search placeholders and empty states. */
  noun: string;
  /** The Lucide icon, written out so Tailwind can see the class. */
  icon: string;
  /** Sets `--cat` to this category's color for everything inside. */
  scope: string;
  /** This category's color as text, outside a scoped surface. */
  text: string;
  route: string;
  /** Artwork its home card shows in place of rows. */
  art?: "posters" | "shelf";
  /** What the art it draws needs credited: maps on a ride, posters, covers. */
  credits: readonly Credit[];
  /** The kinds its type segment filters between. */
  types?: readonly CategoryType[];
}

export const CATEGORIES: readonly Category[] = [
  {
    id: "rides",
    name: "Rides",
    noun: "rides",
    icon: "icon-[lucide--bike]",
    scope: "cat-rides",
    text: "text-cat-rides",
    route: "/rides/",
    credits: ["maps"],
  },
  {
    id: "code",
    name: "Code",
    noun: "repositories",
    icon: "icon-[lucide--code]",
    scope: "cat-code",
    text: "text-cat-code",
    route: "/code/",
    credits: [],
  },
  {
    id: "reading",
    name: "Reading",
    noun: "books and articles",
    icon: "icon-[lucide--book]",
    scope: "cat-reading",
    text: "text-cat-reading",
    route: "/reading/",
    credits: [],
    types: [
      { value: "Book", label: "Books" },
      { value: "Article", label: "Articles" },
    ],
  },
  {
    id: "writing",
    name: "Writing",
    noun: "posts",
    icon: "icon-[lucide--pen-line]",
    scope: "cat-writing",
    text: "text-cat-writing",
    route: "/writing/",
    credits: [],
  },
  {
    id: "watching",
    name: "Watching",
    noun: "shows and movies",
    icon: "icon-[lucide--tv]",
    scope: "cat-watching",
    text: "text-cat-watching",
    route: "/watching/",
    art: "posters",
    credits: ["posters"],
    types: [
      { value: "Active", label: "Active" },
      { value: "Show", label: "Shows" },
      { value: "Movie", label: "Movies" },
    ],
  },
  {
    id: "listening",
    name: "Listening",
    noun: "albums and podcasts",
    icon: "icon-[lucide--headphones]",
    scope: "cat-listening",
    text: "text-cat-listening",
    route: "/listening/",
    art: "shelf",
    credits: ["covers"],
    types: [
      { value: "Album", label: "Albums" },
      { value: "Podcast", label: "Podcasts" },
    ],
  },
];

export function category(id: CategoryId): Category {
  const found = CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}

/** The categories this build shows, in home-card order. */
export function enabledCategories(
  enabled: (id: CategoryId) => boolean = isEnabled,
): Category[] {
  return CATEGORIES.filter((c) => enabled(c.id));
}

/**
 * What the home cards shown need credited. Only a card that draws art carries
 * a credit, and a card that hid for having nothing to show carries none.
 */
export function homeCredits(shown: readonly CategoryId[]): Credit[] {
  return CATEGORIES.filter((c) => shown.includes(c.id)).flatMap((c) =>
    c.art ? c.credits : [],
  );
}

/**
 * The footer's credit line. Artwork is credited to its owners. A page showing
 * only maps stops at CARTO's credit, which already says whose they are.
 */
export function creditLine(credits: readonly Credit[]): string {
  const shown = CREDIT_ORDER.filter((c) => credits.includes(c));
  if (shown.length === 0) return "";
  const lines: string[] = shown.map((c) => CREDIT_LINES[c]);
  if (shown.some((c) => c !== "maps"))
    lines.push("Artwork belongs to its owners.");
  return lines.join(" ");
}
