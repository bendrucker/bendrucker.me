import { describe, expect, it } from "vitest";
import { bigScore, isBig, isHilly, rankHighlights, rankRecords } from "./rank";

const ride = (id: string, distanceM: number, climbM: number) => ({
  id,
  distanceM,
  climbM,
});

describe("isBig", () => {
  it("takes either bar on its own", () => {
    expect(isBig(ride("far", 80_000, 0))).toBe(true);
    expect(isBig(ride("high", 10_000, 1_200))).toBe(true);
    expect(isBig(ride("neither", 79_999, 1_199))).toBe(false);
  });
});

describe("bigScore", () => {
  it("scores by whichever bar the ride clears by more", () => {
    expect(bigScore(ride("a", 160_000, 1_200))).toBe(2);
    expect(bigScore(ride("b", 80_000, 3_600))).toBe(3);
  });
});

describe("isHilly", () => {
  it("marks eighteen metres a kilometre and up", () => {
    expect(isHilly(ride("steep", 10_000, 180))).toBe(true);
    expect(isHilly(ride("flat", 10_000, 179))).toBe(false);
    expect(isHilly(ride("still", 0, 50))).toBe(false);
  });
});

describe("rankHighlights", () => {
  it("keeps the big rides, biggest first, newer first on a tie", () => {
    const rides = [
      ride("small", 20_000, 100),
      ride("tie-newer", 160_000, 0),
      ride("top", 80_000, 3_600),
      ride("tie-older", 160_000, 0),
    ];
    expect(rankHighlights(rides).map((r) => r.id)).toEqual([
      "top",
      "tie-newer",
      "tie-older",
    ]);
    expect(rankHighlights(rides, 1)).toHaveLength(1);
  });
});

describe("rankRecords", () => {
  it("ranks distance and climbing apart and skips zeros", () => {
    const rides = [
      ride("far", 200_000, 0),
      ride("high", 50_000, 3_000),
      ride("mid", 100_000, 1_000),
      ride("trainer", 30_000, 0),
    ];
    const { longest, climbing } = rankRecords(rides, 2);
    expect(longest.map((r) => r.id)).toEqual(["far", "mid"]);
    expect(climbing.map((r) => r.id)).toEqual(["high", "mid"]);
  });
});
