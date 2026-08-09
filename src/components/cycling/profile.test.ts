import { describe, expect, it } from "vitest";
import { seededRandom, syntheticProfile } from "./profile";

const FLAT_FEET_PER_MILE = 12;
const HILLY_FEET_PER_MILE = 180;

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

  it("keeps a flat ride close to the midpoint", () => {
    for (const sample of syntheticProfile("ride-1", 0, 64)) {
      expect(Math.abs(sample - 0.5)).toBeLessThan(0.15);
    }
  });
});
