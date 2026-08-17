export type Units = "imperial" | "metric";

export type ViewMode = "log" | "highlights" | "prs";

/** One segment of a `SegmentedControl`. */
export interface SegmentedOption {
  value: string;
  label: string;
  /**
   * Spoken instead of `label` where the visible text is an abbreviation the
   * design shortens for width: "mi", "prs".
   */
  name?: string;
}

/** `[latitude, longitude]`, matching the order Strava's encoded polylines use. */
export type Coordinate = [number, number];

export interface RidePhoto {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  /** Describes what the photo shows. */
  alt: string;
}

export type RideBadgeKind =
  "new-climb" | "new-location" | "longest" | "most-climbing" | "race";

/** Lucide icons the cycling components draw on. See `Icon.vue`. */
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
}

export interface RideFact extends Decorated {
  id: string;
}

export interface Ride {
  id: string;
  name: string;
  stravaUrl: string;
  /** Local wall-clock ISO string, without a zone suffix. */
  startedAt: string;
  distanceMi: number;
  elevationFt: number;
  movingSeconds: number;
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
  /** See {@link RideBadge} for why the icon travels beside the title. */
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
