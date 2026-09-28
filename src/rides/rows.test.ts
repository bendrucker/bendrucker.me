import { describe, expect, it } from "vitest";
import {
  byMonth,
  fromRouteTuple,
  fromTuple,
  rideIndex,
  toRouteTuple,
  toTuple,
  type RideRow,
} from "./rows";

const row = (id: string, day: string): RideRow => ({
  id,
  name: `Ride ${id}`,
  day,
  distanceM: 40_000,
  climbM: 500,
});

describe("tuples", () => {
  it("round-trip a row and a tile", () => {
    const one = row("a", "2026-09-01");
    expect(fromTuple(toTuple(one))).toEqual(one);
    const tile = { ...one, path: "M0 0L1 1" };
    expect(fromRouteTuple(toRouteTuple(tile))).toEqual(tile);
  });

  it("refuses an index whose rows lost a field", () => {
    expect(
      rideIndex.safeParse({ rides: [["a", "b", "2026-09-01", 1]] }).success,
    ).toBe(false);
  });
});

describe("byMonth", () => {
  it("groups newest-first rows into their months", () => {
    const months = byMonth([
      row("c", "2026-09-20"),
      row("b", "2026-09-02"),
      row("a", "2026-07-30"),
    ]);
    expect(months.map((m) => [m.key, m.rides.map(([id]) => id)])).toEqual([
      ["2026-09", ["c", "b"]],
      ["2026-07", ["a"]],
    ]);
  });
});
