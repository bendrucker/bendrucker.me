export interface Repo {
  name: string;
  owner: string;
  description: string;
  url: string;
  primaryLanguage: {
    name: string;
    color: string;
    extension: string | null;
  } | null;
  stargazerCount: number;
  createdAt: string | null;
  lastActivity: string;
  activitySummary: {
    prCount: number;
    reviewCount: number;
    issueCount: number;
    mergeCount: number;
    hasMergedPRs: boolean;
  };
  years: number[];
}

export interface Language {
  name: string;
  color: string;
  extension: string | null;
  count: number;
}

export interface YearCount {
  year: number;
  count: number;
}

// The sort control renders its options from this list and narrows the value it
// reads back against it, so an option and the type cannot drift apart. The
// filter schema builds its enum from the same list.
export const SORT_ORDERS = ["recent", "active", "stars", "name"] as const;

export type SortOrder = (typeof SORT_ORDERS)[number];

// "all" is the owner control's value for an unfiltered owner. The filter schema
// accepts it and drops it, so `FilterState` goes to an action as it stands.
export const OWNER_FILTERS = ["all", "personal", "external"] as const;

export type OwnerFilter = (typeof OWNER_FILTERS)[number];

// The filter controls' reactive state, assignable to the repos action's input
// so the composable sends it untranslated.
export interface FilterState {
  owner: OwnerFilter;
  language: string | null;
  search: string;
  sort: SortOrder;
  year: number | null;
}

export interface ActivityState {
  repos: Repo[];
  cursor: string | null;
  hasMore: boolean;
  loading: boolean;
  total: number;
  filters: FilterState;
  languages: Language[];
  years: YearCount[];
  currentYear: number | null;
}

// The cycling page's contract. `src/activity/feed.ts` fills it from D1 and
// `src/components/cycling/fixtures.ts` fills it by hand for the stories, so a
// field added here has to come from both.

/** `[latitude, longitude]`, matching the order Strava's encoded polylines use. */
export type Coordinate = [number, number];

export interface RidePhoto {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  alt: string;
}

export type RideBadgeKind =
  "new-climb" | "new-location" | "longest" | "most-climbing" | "race";

/** Lucide icons the cycling components draw on. See `LucideIcon.vue`. */
export const iconNames = [
  "clock",
  "flag",
  "flame",
  "gauge",
  "map-pin",
  "mountain",
  "ruler",
  "timer",
  "trending-up",
  "zap",
] as const;

export type IconName = (typeof iconNames)[number];

/**
 * Decorative icon rendered ahead of a label. It is kept out of the label so the
 * label stays the accessible name and the icon can be hidden, which stops a
 * screen reader announcing the icon beside "3,204 ft climb".
 */
type Decorated = { icon?: IconName; label: string };

export interface RideBadge extends Decorated {
  kind: RideBadgeKind;
  /**
   * The window the superlative is measured over, such as `aug`. A bare
   * "longest" reads as all time, and these are only ever the best of their
   * month. Rendered as the badge's own left-hand segment.
   */
  scope?: string;
}

export interface RideFact extends Decorated {
  id: string;
}

/**
 * The measurements are optional because a ride can reach the feed from a head
 * unit summary alone, which records that it happened and how long it took
 * and nothing else. A card shows what it has rather than a zero.
 */
export interface Ride {
  id: string;
  name: string;
  /** Absent for a ride that never reached Strava. */
  stravaUrl?: string;
  /** Local wall-clock ISO string, without a zone suffix. */
  startedAt: string;
  distanceMi?: number;
  elevationFt?: number;
  movingSeconds?: number;
  averageWatts?: number;
  companionCount?: number;
  route?: Coordinate[];
  /**
   * Elevation samples normalized to 0..1 across the ride, evenly spaced. Real
   * streams and the synthetic stand-in are interchangeable at this shape.
   */
  elevationProfile?: number[];
  photos: RidePhoto[];
  badges: RideBadge[];
  facts: RideFact[];
}

/** What every mode can say about a month, whichever rides it goes on to show. */
export interface MonthStats {
  /** `YYYY-MM`, used for anchors and rail navigation. */
  key: string;
  label: string;
  distanceMi: number;
  elevationFt: number;
  rideCount: number;
}

export interface MonthGroup extends MonthStats {
  rides: Ride[];
  /** Rides too short to earn a card, summarized as a footnote instead. */
  commuteCount: number;
}

export type HighlightMetric = "distance" | "elevation" | "duration";

export interface Highlight {
  ride: Ride;
  badge: RideBadge;
  metric: HighlightMetric;
}

export interface HighlightMonth extends MonthStats {
  highlights: Highlight[];
}

export type RankedMetric = "distance" | "elevation" | "duration" | "clock";

export interface RankedRow {
  id: string;
  name: string;
  /** Secondary text beside the name, such as a year or an average grade. */
  detail?: string;
  value: number;
  href?: string;
}

export interface RankedList {
  id: string;
  title: string;
  icon?: IconName;
  metric: RankedMetric;
  rows: RankedRow[];
}

export interface PowerBest {
  id: string;
  label: string;
  /** Null renders an em dash placeholder for a duration with no stream yet. */
  watts: number | null;
}

export interface YearTotals {
  year: number;
  distanceMi: number;
  elevationFt: number;
  rideCount: number;
  /** Qualifies the ride count, such as "rides since may". */
  note?: string;
}

export interface RecordPeriod {
  /** The window the lists cover, shown on the period control: "all", "2026". */
  period: string;
  lists: RankedList[];
}

/** Everything the root view renders, in the shape a page would hand it. */
export interface CyclingActivityData {
  totals: YearTotals;
  months: MonthGroup[];
  highlightMonths: HighlightMonth[];
  /** In display order. The first is what an unknown period falls back to. */
  records: RecordPeriod[];
  powerBests: PowerBest[];
  powerNote?: string;
}
