import { describe, expect, it } from "vitest";
import {
  normalizeProfile,
  relief,
  seededRandom,
  syntheticProfile,
} from "./profile";

const FLAT_FEET_PER_MILE = 12;
const HILLY_FEET_PER_MILE = 180;

/** What `relief` returns at either end of its scale. */
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
    expect(syntheticProfile("ride-1", HILLY_FEET_PER_MILE)).toEqual(
      syntheticProfile("ride-1", HILLY_FEET_PER_MILE),
    );
  });

  it("differs across seeds", () => {
    expect(syntheticProfile("ride-1", HILLY_FEET_PER_MILE)).not.toEqual(
      syntheticProfile("ride-2", HILLY_FEET_PER_MILE),
    );
  });

  it("stays within 0..1", () => {
    for (const feetPerMile of [0, 12, 90, 220, 500]) {
      for (const sample of syntheticProfile("ride-1", feetPerMile, 64)) {
        expect(sample).toBeGreaterThanOrEqual(0);
        expect(sample).toBeLessThanOrEqual(1);
      }
    }
  });

  it("defaults to 22 samples and honours an explicit count", () => {
    expect(syntheticProfile("ride-1", HILLY_FEET_PER_MILE)).toHaveLength(22);
    expect(syntheticProfile("ride-1", HILLY_FEET_PER_MILE, 5)).toHaveLength(5);
    expect(syntheticProfile("ride-1", HILLY_FEET_PER_MILE, 0)).toEqual([]);
  });

  it("swings wider for a hilly ride than a flat one", () => {
    const flat = syntheticProfile("ride-1", FLAT_FEET_PER_MILE, 64);
    const hilly = syntheticProfile("ride-1", HILLY_FEET_PER_MILE, 64);
    expect(spread(hilly)).toBeGreaterThan(spread(flat));
  });

  it("keeps a flat ride down against the floor", () => {
    for (const sample of syntheticProfile("ride-1", 0, 64)) {
      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample).toBeLessThanOrEqual(MIN_RELIEF);
    }
  });

  it("stands a hilly ride at the top of the scale", () => {
    const hilly = syntheticProfile("ride-1", HILLY_FEET_PER_MILE, 64);
    expect(Math.max(...hilly)).toBeCloseTo(MAX_RELIEF);
    expect(Math.min(...hilly)).toBe(0);
  });

  it("draws a single sample at the baseline rather than an endpoint", () => {
    expect(syntheticProfile("ride-1", HILLY_FEET_PER_MILE, 1)).toHaveLength(1);
  });

  it("stays finite for degenerate gradients", () => {
    for (const feetPerMile of [NaN, Infinity, -Infinity, -500]) {
      for (const sample of syntheticProfile("ride-1", feetPerMile, 16)) {
        expect(sample).toBeGreaterThanOrEqual(0);
        expect(sample).toBeLessThanOrEqual(1);
      }
    }
  });

  // Locks the generator constants, which the same-run comparisons above cannot.
  it("matches a recorded sequence", () => {
    expect(syntheticProfile("ride-1", 130.5, 5)).toMatchInlineSnapshot(`
      [
        0.24272288391575522,
        0.65172,
        0,
        0.5009338321637166,
        0.5417028076096769,
      ]
    `);
  });
});

describe("relief", () => {
  it("bottoms out at the flat end and tops out at the steep one", () => {
    expect(relief(0)).toBe(MIN_RELIEF);
    expect(relief(25)).toBe(MIN_RELIEF);
    expect(relief(150)).toBe(MAX_RELIEF);
    expect(relief(400)).toBe(MAX_RELIEF);
  });

  it("rises with climbing per mile in between", () => {
    const rates = [30, 60, 90, 120, 145];
    const heights = rates.map((rate) => relief(rate));
    for (const [index, height] of heights.entries()) {
      if (index === 0) continue;
      expect(height).toBeGreaterThan(heights[index - 1]!);
    }
    expect(heights.at(-1)!).toBeLessThan(MAX_RELIEF);
  });

  // The pair that prompted the scale: the loop climbs 2.5x what the city ride
  // does over 1.5x the distance, and has to draw visibly taller for it.
  it("stands a headlands loop well above a ride around the city", () => {
    expect(relief(2425 / 23.3)).toBeGreaterThan(1.5 * relief(997 / 15.4));
  });

  it("draws an unknown rate at the floor", () => {
    expect(relief(Number.NaN)).toBe(MIN_RELIEF);
    expect(relief(-100)).toBe(MIN_RELIEF);
  });
});

describe("normalizeProfile", () => {
  it("rescales the lowest point to 0 and the highest to its relief", () => {
    expect(normalizeProfile([100, 150, 200, 100], HILLY_FEET_PER_MILE)).toEqual(
      [0, MAX_RELIEF / 2, MAX_RELIEF, 0],
    );
  });

  it("scales the same shape by how hilly the ride was", () => {
    const altitudes = [100, 150, 200, 100];
    const flat = normalizeProfile(altitudes, FLAT_FEET_PER_MILE);
    const hilly = normalizeProfile(altitudes, HILLY_FEET_PER_MILE);
    expect(Math.max(...hilly)).toBeGreaterThan(Math.max(...flat));
    expect(hilly.map((sample) => sample / MAX_RELIEF)).toEqual(
      flat.map((sample) => sample / MIN_RELIEF),
    );
  });

  it("sits a ride that never changed altitude at its relief", () => {
    expect(normalizeProfile([12, 12, 12], FLAT_FEET_PER_MILE)).toEqual([
      MIN_RELIEF,
      MIN_RELIEF,
      MIN_RELIEF,
    ]);
  });

  it("holds a non-finite sample mid-band", () => {
    expect(normalizeProfile([0, Number.NaN, 10], HILLY_FEET_PER_MILE)).toEqual([
      0,
      MAX_RELIEF / 2,
      MAX_RELIEF,
    ]);
  });

  it("draws nothing from no samples", () => {
    expect(normalizeProfile([], HILLY_FEET_PER_MILE)).toEqual([]);
  });
});
