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

export interface RideBadge {
  kind: RideBadgeKind;
  label: string;
}

export interface RideFact {
  id: string;
  label: string;
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
  metric: RankedMetric;
  rows: RankedRow[];
}

export interface PowerBest {
  id: string;
  label: string;
  /** Null renders an em dash placeholder for a duration with no stream yet. */
  watts: number | null;
}
