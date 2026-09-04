import { describe, expect, it } from "vitest";
import {
  normalizeProfile,
  relief,
  seededRandom,
  syntheticProfile,
} from "./profile";

const SPIN_FEET = 200;
const BIG_DAY_FEET = 12_000;

const MIN_RELIEF = 0.12;
const MAX_RELIEF = 0.75;

function spread(samples: number[]): number {
  return Math.max(...samples) - Math.min(...samples);
}

function sequence(seed: string, length = 16): number[] {
  const random = seededRandom(seed);
  return Array.from({ length }, () => random());
}

describe("seededRandom", () => {
  it("repeats the same sequence for the same seed", () => {
    expect(sequence("ride-1")).toEqual(sequence("ride-1"));
  });

  it("diverges across seeds", () => {
    expect(sequence("ride-1")).not.toEqual(sequence("ride-2"));
  });

  it("stays in 0..1 without repeating itself immediately", () => {
    const values = sequence("ride-1", 64);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(new Set(values).size).toBe(values.length);
  });

  it("still produces a usable sequence for an empty seed", () => {
    const values = sequence("", 8);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("syntheticProfile", () => {
  it("repeats exactly for the same seed", () => {
    expect(syntheticProfile("ride-1", BIG_DAY_FEET)).toEqual(
      syntheticProfile("ride-1", BIG_DAY_FEET),
    );
  });

  it("differs across seeds", () => {
    expect(syntheticProfile("ride-1", BIG_DAY_FEET)).not.toEqual(
      syntheticProfile("ride-2", BIG_DAY_FEET),
    );
  });

  it("stays within 0..1", () => {
    for (const elevationFt of [0, 120, 900, 2200, 20_000]) {
      for (const sample of syntheticProfile("ride-1", elevationFt, 64)) {
        expect(sample).toBeGreaterThanOrEqual(0);
        expect(sample).toBeLessThanOrEqual(1);
      }
    }
  });

  it("defaults to 22 samples and honours an explicit count", () => {
    expect(syntheticProfile("ride-1", BIG_DAY_FEET)).toHaveLength(22);
    expect(syntheticProfile("ride-1", BIG_DAY_FEET, 5)).toHaveLength(5);
    expect(syntheticProfile("ride-1", BIG_DAY_FEET, 0)).toEqual([]);
  });

  it("swings wider for a big day than a spin around the city", () => {
    const spin = syntheticProfile("ride-1", SPIN_FEET, 64);
    const big = syntheticProfile("ride-1", BIG_DAY_FEET, 64);
    expect(spread(big)).toBeGreaterThan(spread(spin));
  });

  it("keeps a ride that barely climbed down against the floor", () => {
    for (const sample of syntheticProfile("ride-1", 0, 64)) {
      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample).toBeLessThanOrEqual(MIN_RELIEF);
    }
  });

  it("stands a big day at the top of the scale", () => {
    const big = syntheticProfile("ride-1", BIG_DAY_FEET, 64);
    expect(Math.max(...big)).toBeCloseTo(MAX_RELIEF);
    expect(Math.min(...big)).toBe(0);
  });

  it("draws a single sample at the baseline rather than an endpoint", () => {
    expect(syntheticProfile("ride-1", BIG_DAY_FEET, 1)).toHaveLength(1);
  });

  it("stays finite for degenerate elevations", () => {
    for (const elevationFt of [NaN, Infinity, -Infinity, -500, null]) {
      for (const sample of syntheticProfile("ride-1", elevationFt, 16)) {
        expect(sample).toBeGreaterThanOrEqual(0);
        expect(sample).toBeLessThanOrEqual(1);
      }
    }
  });

  // Locks the generator constants, which the same-run comparisons above cannot.
  it("matches a recorded sequence", () => {
    expect(syntheticProfile("ride-1", 2425, 5)).toMatchInlineSnapshot(`
      [
        0.18583905926405372,
        0.4989848083117122,
        0,
        0.3835364454352537,
        0.41475092312194034,
      ]
    `);
  });
});

describe("relief", () => {
  it("bottoms out at an easy day and tops out at a big one", () => {
    expect(relief(0)).toBe(MIN_RELIEF);
    expect(relief(400)).toBe(MIN_RELIEF);
    expect(relief(8000)).toBe(MAX_RELIEF);
    expect(relief(20_000)).toBe(MAX_RELIEF);
  });

  it("rises with the feet climbed in between", () => {
    const climbs = [500, 1000, 2000, 4000, 7000];
    const heights = climbs.map((climb) => relief(climb));
    for (const [index, height] of heights.entries()) {
      if (index === 0) continue;
      expect(height).toBeGreaterThan(heights[index - 1]!);
    }
    expect(heights.at(-1)!).toBeLessThan(MAX_RELIEF);
  });

  // A Headlands loop climbs 2.5x what a ride around the city does, and has to
  // draw visibly taller for it.
  it("stands a headlands loop well above a ride around the city", () => {
    expect(relief(2425)).toBeGreaterThan(1.4 * relief(997));
  });

  // The rate reads these two as equals, and a 300 km day is not the equal of
  // an evening spin.
  it("stands a double century well above an evening spin at the same rate", () => {
    expect(relief(17_060)).toBeGreaterThan(2 * relief(358));
  });

  it("draws an unknown elevation at the floor", () => {
    expect(relief(Number.NaN)).toBe(MIN_RELIEF);
    expect(relief(-100)).toBe(MIN_RELIEF);
    expect(relief(null)).toBe(MIN_RELIEF);
    expect(relief(undefined)).toBe(MIN_RELIEF);
  });
});

describe("normalizeProfile", () => {
  it("rescales the lowest point to 0 and the highest to its relief", () => {
    expect(normalizeProfile([100, 150, 200, 100], BIG_DAY_FEET)).toEqual([
      0,
      MAX_RELIEF / 2,
      MAX_RELIEF,
      0,
    ]);
  });

  it("scales the same shape by how much the ride climbed", () => {
    const altitudes = [100, 150, 200, 100];
    const spin = normalizeProfile(altitudes, SPIN_FEET);
    const big = normalizeProfile(altitudes, BIG_DAY_FEET);
    expect(Math.max(...big)).toBeGreaterThan(Math.max(...spin));
    expect(big.map((sample) => sample / MAX_RELIEF)).toEqual(
      spin.map((sample) => sample / MIN_RELIEF),
    );
  });

  it("sits a ride that never changed altitude at its relief", () => {
    expect(normalizeProfile([12, 12, 12], SPIN_FEET)).toEqual([
      MIN_RELIEF,
      MIN_RELIEF,
      MIN_RELIEF,
    ]);
  });

  it("holds a non-finite sample mid-band", () => {
    expect(normalizeProfile([0, Number.NaN, 10], BIG_DAY_FEET)).toEqual([
      0,
      MAX_RELIEF / 2,
      MAX_RELIEF,
    ]);
  });

  it("draws nothing from no samples", () => {
    expect(normalizeProfile([], BIG_DAY_FEET)).toEqual([]);
  });
});
