import { describe, it, expect } from "vitest";
import { findClimbs } from "./climb";
import type { Coordinate } from "./types";

// Eleven points due north, evenly spaced, so profile sample `i` of eleven
// lands on route point `i`.
const route: Coordinate[] = Array.from({ length: 11 }, (_, i) => [
  37 + i * 0.01,
  -122,
]);

describe("findClimbs", () => {
  it("finds each climb and places its summit on the route", () => {
    const profile = [0, 200, 400, 300, 100, 0, 300, 600, 500, 400, 300];

    expect(findClimbs(profile, route)).toEqual([
      { gainM: 400, summit: route[2] },
      { gainM: 600, summit: route[7] },
    ]);
  });

  it("keeps a dip within tolerance inside one climb", () => {
    const profile = [0, 200, 400, 380, 600, 800, 1000, 900, 800, 700, 600];

    expect(findClimbs(profile, route)).toEqual([
      { gainM: 1000, summit: route[6] },
    ]);
  });

  it("drops a segment that gains too little to count", () => {
    const profile = [0, 100, 0, 0, 0, 400, 0, 0, 0, 0, 0];

    expect(findClimbs(profile, route)).toEqual([
      { gainM: 400, summit: route[5] },
    ]);
  });

  it("finds nothing on a flat ride or with nothing to read", () => {
    expect(
      findClimbs(
        Array.from({ length: 11 }, () => 50),
        route,
      ),
    ).toEqual([]);
    expect(findClimbs([], route)).toEqual([]);
    expect(findClimbs([0, 400], [])).toEqual([]);
  });
});
