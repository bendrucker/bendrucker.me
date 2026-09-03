const DEFAULT_SAMPLE_COUNT = 22;

/** Feet per mile at which a ride counts as fully hilly. */
const STEEP_FEET_PER_MILE = 220;

const BASELINE = 0.5;
const FLAT_AMPLITUDE = 0.08;
const HILLY_AMPLITUDE = 0.42;
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

/** Non-finite input falls back to the baseline, which SVG can still draw. */
function clamp(value: number): number {
  if (!Number.isFinite(value)) return BASELINE;
  return Math.min(1, Math.max(0, value));
}

/** Deterministic 0..1 elevation samples for a ride, evenly spaced. */
export function syntheticProfile(
  seed: string,
  feetPerMile: number,
  sampleCount: number = DEFAULT_SAMPLE_COUNT,
): number[] {
  const random = seededRandom(seed);
  const ratio = feetPerMile / STEEP_FEET_PER_MILE;
  const hilliness = Number.isNaN(ratio) ? 0 : Math.min(1, Math.max(0, ratio));
  const amplitude = FLAT_AMPLITUDE + HILLY_AMPLITUDE * hilliness;

  const waves = HARMONICS.map((harmonic) => ({
    frequency: harmonic + random() * 0.6,
    phase: random() * 2 * Math.PI,
    weight: (0.25 + random()) / harmonic,
  }));
  const totalWeight = waves.reduce((total, wave) => total + wave.weight, 0);

  return Array.from({ length: sampleCount }, (_unused, index) => {
    const progress = sampleCount > 1 ? index / (sampleCount - 1) : 0;
    const shape =
      waves.reduce(
        (sum, wave) =>
          sum +
          wave.weight *
            Math.sin(wave.phase + progress * wave.frequency * 2 * Math.PI),
        0,
      ) / totalWeight;
    const jitter = (random() - 0.5) * 0.06 * hilliness;
    return clamp(BASELINE + amplitude * shape + jitter);
  });
}

/**
 * Rescales a recorded profile to the 0..1 the chart draws, so the lowest
 * point sits on the floor and the highest at the ceiling however tall the
 * ride was. A flat ride sits at the baseline rather than dividing by zero.
 */
export function normalizeProfile(altitudes: number[]): number[] {
  const finite = altitudes.filter((altitude) => Number.isFinite(altitude));
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min;
  return altitudes.map((altitude) =>
    span > 0 ? clamp((altitude - min) / span) : BASELINE,
  );
}
