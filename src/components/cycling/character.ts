import type { IconName, Ride } from "@/activity/types";

export type RideTraitKind = "race" | "long" | "hilly";

/** One thing worth saying about a ride at a glance, as an icon with a name. */
export interface RideTrait {
  kind: RideTraitKind;
  icon: IconName;
  label: string;
}

/** Above this many feet of climbing per mile a ride was about the hills. */
export const HILLY_FT_PER_MI = 80;
/** From this distance a ride was the day. */
export const LONG_MI = 60;

const RACE = { kind: "race", icon: "flag", label: "Race" } as const;
const LONG = { kind: "long", icon: "ruler", label: "Long ride" } as const;
const HILLY = { kind: "hilly", icon: "mountain", label: "Hilly" } as const;

/**
 * Whether a ride was a race, from its name. The feed carries a race badge
 * kind but nothing assigns it yet, and a race on Strava is named as one.
 */
const RACE_NAME = /\b(race|crit|criterium|tt|time trial)\b/i;

/**
 * What a ride was, in the order worth reading: a race first, then how long
 * it was, then how hilly. A ride with none of these is an ordinary one.
 */
export function rideTraits(ride: Ride): RideTrait[] {
  const traits: RideTrait[] = [];
  if (
    ride.badges.some((badge) => badge.kind === "race") ||
    RACE_NAME.test(ride.name)
  ) {
    traits.push(RACE);
  }
  const { distanceMi, elevationFt } = ride;
  if (distanceMi !== undefined && distanceMi >= LONG_MI) traits.push(LONG);
  if (
    distanceMi !== undefined &&
    elevationFt !== undefined &&
    distanceMi > 0 &&
    elevationFt / distanceMi >= HILLY_FT_PER_MI
  ) {
    traits.push(HILLY);
  }
  return traits;
}
