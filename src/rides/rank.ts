// Which rides stand out. A big ride goes past 80 km or climbs past 1,200 m,
// and its score is how far past that bar it goes on whichever it clears by
// more. The same rule picks the highlights on the Rides route and on home.
import type { RideRow } from "./rows";

export const BIG = { distanceM: 80_000, climbM: 1_200 } as const;

/** Metres climbed per kilometre that earn a row the mountain mark. */
export const HILLY_M_PER_KM = 18;

/** How many rides the highlights lead with: three on a phone, five on desktop. */
export const HIGHLIGHT_COUNT = 5;

/** How many rides each record list names. */
export const RECORD_COUNT = 3;

type Measured = Pick<RideRow, "distanceM" | "climbM">;

export function isBig({ distanceM, climbM }: Measured): boolean {
  return distanceM >= BIG.distanceM || climbM >= BIG.climbM;
}

export function bigScore({ distanceM, climbM }: Measured): number {
  return Math.max(distanceM / BIG.distanceM, climbM / BIG.climbM);
}

export function isHilly({ distanceM, climbM }: Measured): boolean {
  return distanceM > 0 && climbM / (distanceM / 1000) >= HILLY_M_PER_KM;
}

/** The big rides, biggest first. Ties keep the newer ride first. */
export function rankHighlights<T extends Measured>(
  rides: readonly T[],
  count = HIGHLIGHT_COUNT,
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

/** The longest rides and the ones that climbed most. Ties keep the newer ride. */
export function rankRecords<T extends Measured>(
  rides: readonly T[],
  count = RECORD_COUNT,
): Records<T> {
  const top = (measure: (ride: T) => number) =>
    rides
      .filter((ride) => measure(ride) > 0)
      .toSorted((a, b) => measure(b) - measure(a))
      .slice(0, count);
  return {
    longest: top((ride) => ride.distanceM),
    climbing: top((ride) => ride.climbM),
  };
}
