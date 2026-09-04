import { decodeProfile } from "@/activity/track";

export { decodeProfile };

const DEFAULT_SAMPLE_COUNT = 22;

/**
 * The ends of the scale every card's profile is drawn against, in feet of
 * climbing per mile. Both sit at the edges of a season's riding: a morning of
 * hill repeats in the city reaches the top, a flat commute the floor.
 */
const STEEP_FEET_PER_MILE = 150;
const FLAT_FEET_PER_MILE = 25;

/** Height the hilliest ride stands in, as a fraction of the chart. */
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
 * How much of the chart's height a ride's profile stands in.
 *
 * Rides repeat their climbs, so how high one got says little about how hilly
 * it was: a Headlands loop climbs two and a half times what a ride around the
 * city does and tops out lower than it. Climbing per mile sets the height.
 * The vertical axis is then a measure of hilliness that holds across cards,
 * and a rate the data cannot give draws at the floor.
 */
export function relief(feetPerMile: number): number {
  const ratio =
    (feetPerMile - FLAT_FEET_PER_MILE) /
    (STEEP_FEET_PER_MILE - FLAT_FEET_PER_MILE);
  const steepness = Number.isNaN(ratio) ? 0 : Math.min(1, Math.max(0, ratio));
  return MIN_RELIEF + steepness * (MAX_RELIEF - MIN_RELIEF);
}

/** Deterministic elevation samples for a ride, evenly spaced. */
export function syntheticProfile(
  seed: string,
  feetPerMile: number,
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

  return normalizeProfile(shape, feetPerMile);
}

/**
 * Rescales a recorded profile to the share of the chart's height the ride has
 * earned: its lowest point on the floor, its highest at the `relief` its
 * climbing per mile buys. A ride that never changed altitude draws a level
 * band at that height rather than dividing by zero.
 */
export function normalizeProfile(
  altitudes: number[],
  feetPerMile: number,
): number[] {
  const height = relief(feetPerMile);
  const finite = altitudes.filter((altitude) => Number.isFinite(altitude));
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min;
  return altitudes.map((altitude) =>
    span > 0 ? clamp((altitude - min) / span) * height : height,
  );
}
