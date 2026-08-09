export type Units = "imperial" | "metric";

export type ViewMode = "log" | "highlights" | "prs";

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

/**
 * Decorative glyph rendered ahead of a label. It is kept out of the label so
 * the label stays the accessible name and the glyph can be hidden, which stops
 * a screen reader announcing "black up-pointing triangle 3,204 ft climb".
 */
type Decorated = { icon?: string; label: string };

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

export interface MonthGroup {
  /** `YYYY-MM`, used for anchors and rail navigation. */
  key: string;
  label: string;
  rides: Ride[];
  distanceMi: number;
  elevationFt: number;
  rideCount: number;
  /** Rides too short to earn a card, summarized as a footnote instead. */
  commuteCount: number;
}

export type HighlightMetric = "distance" | "elevation" | "duration";

export interface Highlight {
  ride: Ride;
  badge: RideBadge;
  metric: HighlightMetric;
}

export interface HighlightMonth {
  key: string;
  label: string;
  distanceMi: number;
  elevationFt: number;
  rideCount: number;
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
  /** See {@link RideBadge} for why the glyph travels beside the title. */
  icon?: string;
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

/** Everything the root view renders, in the shape a page would hand it. */
export interface CyclingActivityData {
  totals: YearTotals;
  months: MonthGroup[];
  highlightMonths: HighlightMonth[];
  /** Ranked lists per record period, keyed by an entry in `recordPeriods`. */
  records: Record<string, RankedList[]>;
  recordPeriods: string[];
  powerBests: PowerBest[];
  powerNote?: string;
}
