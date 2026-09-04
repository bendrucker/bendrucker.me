import { decodeProfile } from "@/activity/track";

export { decodeProfile };

const DEFAULT_SAMPLE_COUNT = 22;

/**
 * The ends of the scale every card's profile is drawn against, in feet
 * climbed. Both sit at the edges of a season's riding: an evening spin around
 * the city at the floor, a full day in the hills at the top.
 */
const EASY_DAY_FEET = 400;
const BIG_DAY_FEET = 8000;

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
export function relief(elevationFt: number | null | undefined): number {
  const ratio =
    Math.log((elevationFt ?? 0) / EASY_DAY_FEET) /
    Math.log(BIG_DAY_FEET / EASY_DAY_FEET);
  const climbed = Number.isNaN(ratio) ? 0 : Math.min(1, Math.max(0, ratio));
  return MIN_RELIEF + climbed * (MAX_RELIEF - MIN_RELIEF);
}

/** Deterministic elevation samples for a ride, evenly spaced. */
export function syntheticProfile(
  seed: string,
  elevationFt: number | null | undefined,
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

  return normalizeProfile(shape, elevationFt);
}

/**
 * Rescales a recorded profile to the share of the chart's height the ride has
 * earned: its lowest point on the floor, its highest at the `relief` its
 * climbing buys. A ride that never changed altitude draws a level band at
 * that height rather than dividing by zero.
 */
export function normalizeProfile(
  altitudes: number[],
  elevationFt: number | null | undefined,
): number[] {
  const height = relief(elevationFt);
  const finite = altitudes.filter((altitude) => Number.isFinite(altitude));
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min;
  return altitudes.map((altitude) =>
    span > 0 ? clamp((altitude - min) / span) * height : height,
  );
}
