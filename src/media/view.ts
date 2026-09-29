import {
  markGutters,
  type Guttered,
  type GutteredSection,
  type Listed,
} from "@/activity/gutter";
import { matches } from "@/activity/search";
import { groupRows } from "@/activity/sections";
import type { CategoryType } from "@/categories";
import type { MediaRow } from "./types";

/** Highlights: three on a phone, five from the desktop breakpoint up. */
export const HIGHLIGHTS = { phone: 3, desktop: 5 } as const;

/** A row of the month list below the highlights, with its day gutter. */
export type ListRow = Guttered<MediaRow & Listed>;

export type ListSection = GutteredSection<MediaRow & Listed>;

export interface Highlight extends MediaRow {
  /** Past the phone's three: shown from the desktop breakpoint up. */
  desktopOnly: boolean;
}

export interface MediaView {
  highlights: Highlight[];
  sections: ListSection[];
  /** Nothing survived the search and filters. */
  empty: boolean;
  /** How many rows matched, for the search's live region. */
  count: number;
}

export interface MediaFilters {
  q: string;
  /** A type value, like "Book", or "" for all. */
  type: string;
  /** Only what is still in progress, whatever its type. */
  active: boolean;
}

export interface ViewOptions extends MediaFilters {
  thisYear: string;
}

/**
 * The route's rows under its search and type filter. Highlights lead only the
 * default state: a search or a filter shows the plain list, so nothing is
 * ranked out of view. `rows` are newest first, and `highlightKeys` name the
 * highlights in rank order.
 */
export function buildMediaView(
  rows: readonly MediaRow[],
  highlightKeys: readonly string[],
  { q, type, active, thisYear }: ViewOptions,
): MediaView {
  const hit = rows.filter(
    (row) =>
      matches(row, q) &&
      (type === "" || row.type === type) &&
      (!active || row.active === true),
  );
  const plain = q.trim() !== "" || type !== "" || active;

  const byKey = new Map(hit.map((row) => [row.key, row]));
  const top = plain
    ? []
    : highlightKeys
        .slice(0, HIGHLIGHTS.desktop)
        .flatMap((key) => byKey.get(key) ?? []);
  const onPhone = new Set(top.slice(0, HIGHLIGHTS.phone).map((row) => row.key));
  const onDesktop = new Set(top.map((row) => row.key));

  const rest = hit
    .filter((row) => !onPhone.has(row.key))
    .map((row) => ({ ...row, phoneOnly: onDesktop.has(row.key) }));

  const sections = markGutters(groupRows(rest, "month", { thisYear }));

  return {
    highlights: top.map((row, i) => ({
      ...row,
      desktopOnly: i >= HIGHLIGHTS.phone,
    })),
    sections,
    empty: hit.length === 0,
    count: hit.length,
  };
}

/** The keys of the sections a desktop shows, which the sidebar's rail jumps to. */
export function desktopSections(view: MediaView): string[] {
  return view.sections
    .filter((section) => !section.phoneOnly)
    .map((section) => section.key);
}

/**
 * A type filter's URL value: the plural label, lowercased, as in
 * `?type=books`. Anything else reads as no filter.
 */
export function typeParam(
  types: readonly CategoryType[],
  value: string,
): string {
  return types.find((t) => t.value === value)?.label.toLowerCase() ?? "";
}

export function typeFromParam(
  types: readonly CategoryType[],
  param: string | null,
): string {
  const wanted = (param ?? "").toLowerCase();
  return types.find((t) => t.label.toLowerCase() === wanted)?.value ?? "";
}

/** The filters a URL carries, with an unknown type dropped. */
export function filtersFromUrl(
  url: URL,
  types: readonly CategoryType[],
): MediaFilters {
  return {
    q: url.searchParams.get("q") ?? "",
    type: typeFromParam(types, url.searchParams.get("type")),
    active: url.searchParams.get("active") === "1",
  };
}

/** The URL's search once the filters change, keeping any other parameters. */
export function searchWithFilters(
  search: string,
  types: readonly CategoryType[],
  { q, type, active }: MediaFilters,
): string {
  const params = new URLSearchParams(search);
  if (q === "") params.delete("q");
  else params.set("q", q);
  const param = typeParam(types, type);
  if (param === "") params.delete("type");
  else params.set("type", param);
  if (active) params.set("active", "1");
  else params.delete("active");
  const out = params.toString();
  return out === "" ? "" : `?${out}`;
}
