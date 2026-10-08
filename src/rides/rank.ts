// Which rides stand out. A big ride goes past 80 km or climbs past 1,200 m,
// and its score is how far past that bar it goes on whichever it clears by
// more. The same rule picks the highlights on the Rides route and on home.
import { HIGHLIGHTS } from "@/activity/highlights";
import type { RideRow } from "./rows";

export const BIG = { distanceM: 80_000, climbM: 1_200 } as const;

/** Metres climbed per kilometre that earn a row the mountain mark. */
export const HILLY_M_PER_KM = 18;

/** How many rides each record list names. */
export const RECORD_COUNT = 3;

type Measured = Pick<RideRow, "distanceM" | "climbM">;

/**
 * Whether the entry went anywhere. A manual entry, like a year's commuting
 * climb logged as one activity, carries a figure but no distance, and is not a
 * ride to rank.
 */
export function isRide({ distanceM }: Pick<Measured, "distanceM">): boolean {
  return distanceM !== null && distanceM > 0;
}

export function isBig(ride: Measured): boolean {
  const { distanceM, climbM } = ride;
  return (
    isRide(ride) &&
    ((distanceM ?? 0) >= BIG.distanceM || (climbM ?? 0) >= BIG.climbM)
  );
}

export function bigScore({ distanceM, climbM }: Measured): number {
  return Math.max((distanceM ?? 0) / BIG.distanceM, (climbM ?? 0) / BIG.climbM);
}

export function isHilly({ distanceM, climbM }: Measured): boolean {
  if (distanceM === null || climbM === null || distanceM <= 0) return false;
  return climbM / (distanceM / 1000) >= HILLY_M_PER_KM;
}

/** The big rides, biggest first. Ties keep the newer ride first. */
export function rankHighlights<T extends Measured>(
  rides: readonly T[],
  count: number = HIGHLIGHTS.desktop,
): T[] {
  return rides
    .filter((ride) => isBig(ride))
    .toSorted((a, b) => bigScore(b) - bigScore(a))
    .slice(0, count);
}

export interface Records<T> {
  longest: T[];
  climbing: T[];
}

/**
 * The longest rides and the ones that climbed most, of those that went
 * somewhere. Ties keep the newer ride.
 */
export function rankRecords<T extends Measured>(
  rides: readonly T[],
  count = RECORD_COUNT,
): Records<T> {
  const top = (measure: (ride: T) => number | null) =>
    rides
      .filter((ride) => isRide(ride) && (measure(ride) ?? 0) > 0)
      .toSorted((a, b) => (measure(b) ?? 0) - (measure(a) ?? 0))
      .slice(0, count);
  return {
    longest: top((ride) => ride.distanceM),
    climbing: top((ride) => ride.climbM),
  };
}
