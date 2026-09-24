import { haversineMiles } from "./track";
import type { Coordinate } from "./types";

/** Gain a segment needs before it is stored as a climb, in metres. */
export const MIN_CLIMB_M = 150;

/** How far a ride may dip mid-climb, as a share of its altitude range. */
const DESCENT_TOLERANCE = 0.05;

/** One continuous climb within a series of altitudes, by index into it. */
export interface ClimbSpan {
  start: number;
  end: number;
  gain: number;
}

/**
 * The continuous climbs in a series of altitudes, in order, in whatever unit
 * they arrive in. A dip shallower than `DESCENT_TOLERANCE` of the ride's
 * altitude range is a false flat within a climb rather than the end of one,
 * and each deeper dip closes one climb and opens the next. Indices point into
 * `altitudes` as given, skipping any sample that is not finite.
 */
export function climbSpans(altitudes: number[]): ClimbSpan[] {
  const finite = altitudes.filter((altitude) => Number.isFinite(altitude));
  if (finite.length === 0) return [];
  const tolerance =
    (Math.max(...finite) - Math.min(...finite)) * DESCENT_TOLERANCE;

  const spans: ClimbSpan[] = [];
  let current: ClimbSpan | null = null;
  let trough = Number.NaN;
  let troughIndex = -1;
  let peak = Number.NaN;
  for (const [index, altitude] of altitudes.entries()) {
    if (!Number.isFinite(altitude)) continue;
    if (troughIndex === -1) {
      trough = altitude;
      troughIndex = index;
      peak = altitude;
    } else if (altitude > peak) {
      peak = altitude;
      current = { start: troughIndex, end: index, gain: peak - trough };
    } else if (peak - altitude > tolerance) {
      if (current) spans.push(current);
      current = null;
      trough = altitude;
      troughIndex = index;
      peak = altitude;
    } else if (altitude < trough) {
      trough = altitude;
      troughIndex = index;
    }
  }
  if (current) spans.push(current);
  return spans;
}

export interface Climb {
  gainM: number;
  summit: Coordinate;
}

/**
 * Every climb in `profile` that gains at least `MIN_CLIMB_M`, in ride order.
 * The profile is spaced evenly by distance, so a sample's index is a share of
 * the ride's length, and the summit is the route point nearest that far along.
 */
export function findClimbs(profile: number[], route: Coordinate[]): Climb[] {
  if (profile.length < 2 || route.length === 0) return [];
  const spans = climbSpans(profile).filter((span) => span.gain >= MIN_CLIMB_M);
  if (spans.length === 0) return [];

  const cumulative = [0];
  for (let index = 1; index < route.length; index++) {
    cumulative.push(
      cumulative[index - 1]! + haversineMiles(route[index - 1]!, route[index]!),
    );
  }
  const total = cumulative.at(-1)!;

  return spans.map((span) => {
    const reach = (span.end / (profile.length - 1)) * total;
    const index = nearestIndex(cumulative, reach);
    return {
      gainM: span.gain,
      summit: route[index]!,
    };
  });
}

function nearestIndex(values: number[], target: number): number {
  let best = 0;
  for (let index = 1; index < values.length; index++) {
    if (Math.abs(values[index]! - target) < Math.abs(values[best]! - target)) {
      best = index;
    }
  }
  return best;
}
