import { decodeProfile } from "@/activity/track";

export { decodeProfile };

const DEFAULT_SAMPLE_COUNT = 22;

/**
 * The ends of the scale a ride's total climbing is read against, in feet. Both
 * sit at the edges of a season's riding: an evening spin around the city at
 * the floor, a full day in the hills at the top.
 */
const EASY_DAY_FEET = 400;
const BIG_DAY_FEET = 8000;

/**
 * The ends of the same scale for a ride's single longest climb. One sustained
 * grind is the shape a rider remembers, so a ride that spends 3,000 ft going
 * up without a break stands as tall as a day that climbed twice as much in
 * pieces. The floor sits high enough that an ordinary city climb reads on
 * total alone.
 */
const ROLLER_FEET = 500;
const BIG_CLIMB_FEET = 3000;

/** How far a ride may dip mid-climb, as a share of its altitude range. */
const DESCENT_TOLERANCE = 0.05;

/** Height the biggest day stands in, as a fraction of the chart. */
const MAX_RELIEF = 0.75;

/** Height the flattest ride keeps, so its card still reads as a horizon. */
const MIN_RELIEF = 0.12;

const MID_BAND = 0.5;
const HARMONICS = [1, 2, 3];

/**
 * Deterministic 0..1 generator, stable for a given seed string. A linear
 * congruential generator seeded by the string's rolling hash.
 */
export function seededRandom(seed: string): () => number {
  let state = 0;
  for (const character of seed) {
    state = (state * 31 + character.charCodeAt(0)) >>> 0;
  }
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Non-finite input falls back to mid-band, which SVG can still draw. */
function clamp(value: number): number {
  if (!Number.isFinite(value)) return MID_BAND;
  return Math.min(1, Math.max(0, value));
}

/**
 * How much of the chart's height a ride's profile stands in, from the feet the
 * card already prints.
 *
 * The scale is logarithmic. A season spans two hundredfold between a commute
 * and a double century, so a linear axis presses everything short of an epic
 * onto the floor. Climbing per mile, the other candidate, is scale-free: it
 * stands a four-mile evening spin level with a day that climbed fifty times
 * as much. An elevation the data cannot give draws at the floor.
 */
export function relief(
  elevationFt: number | null | undefined,
  longestClimbFt: number | null | undefined = 0,
): number {
  const climbed = Math.max(
    logScale(elevationFt, EASY_DAY_FEET, BIG_DAY_FEET),
    logScale(longestClimbFt, ROLLER_FEET, BIG_CLIMB_FEET),
  );
  return MIN_RELIEF + climbed * (MAX_RELIEF - MIN_RELIEF);
}

/** Where `feet` falls between the ends of a logarithmic scale, in 0..1. */
function logScale(
  feet: number | null | undefined,
  floor: number,
  ceiling: number,
): number {
  const ratio = Math.log((feet ?? 0) / floor) / Math.log(ceiling / floor);
  return Number.isNaN(ratio) ? 0 : Math.min(1, Math.max(0, ratio));
}

/**
 * The biggest continuous climb in a series of altitudes, in whatever unit they
 * arrive in. A dip shallower than `DESCENT_TOLERANCE` of the ride's altitude
 * range is a false flat within a climb rather than the end of one.
 */
export function longestClimb(altitudes: number[]): number {
  const finite = altitudes.filter((altitude) => Number.isFinite(altitude));
  if (finite.length === 0) return 0;
  const tolerance =
    (Math.max(...finite) - Math.min(...finite)) * DESCENT_TOLERANCE;

  let longest = 0;
  let trough = finite[0]!;
  let peak = trough;
  for (const altitude of finite) {
    if (altitude > peak) {
      peak = altitude;
      longest = Math.max(longest, peak - trough);
    } else if (peak - altitude > tolerance) {
      trough = altitude;
      peak = altitude;
    } else if (altitude < trough) {
      trough = altitude;
    }
  }
  return longest;
}

/** Deterministic elevation samples for a ride, evenly spaced. */
export function syntheticProfile(
  seed: string,
  height: number,
  sampleCount: number = DEFAULT_SAMPLE_COUNT,
): number[] {
  const random = seededRandom(seed);
  const waves = HARMONICS.map((harmonic) => ({
    frequency: harmonic + random() * 0.6,
    phase: random() * 2 * Math.PI,
    weight: (0.25 + random()) / harmonic,
  }));
  const totalWeight = waves.reduce((total, wave) => total + wave.weight, 0);

  const shape = Array.from({ length: sampleCount }, (_unused, index) => {
    const progress = sampleCount > 1 ? index / (sampleCount - 1) : 0;
    const point =
      waves.reduce(
        (sum, wave) =>
          sum +
          wave.weight *
            Math.sin(wave.phase + progress * wave.frequency * 2 * Math.PI),
        0,
      ) / totalWeight;
    return point + (random() - 0.5) * 0.06;
  });

  return normalizeProfile(shape, height);
}

/**
 * Rescales a recorded profile into `height`, the share of the chart a ride has
 * earned from `relief`: its lowest point on the floor, its highest at that
 * height. A ride that never changed altitude draws a level band there rather
 * than dividing by zero.
 */
export function normalizeProfile(
  altitudes: number[],
  height: number,
): number[] {
  const finite = altitudes.filter((altitude) => Number.isFinite(altitude));
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min;
  return altitudes.map((altitude) =>
    span > 0 ? clamp((altitude - min) / span) * height : height,
  );
}
