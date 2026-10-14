import { describe, expect, it } from "vitest";
import {
  dayShuffle,
  secondsUntilUtcMidnight,
  seededShuffle,
  utcDay,
} from "./shuffle";

const albums = ["Promises", "Hard Fork", "In Rainbows", "Acquired", "Blonde"];

describe("seededShuffle", () => {
  it("gives the same order for the same seed", () => {
    expect(seededShuffle(albums, "2026-09-27")).toEqual(
      seededShuffle(albums, "2026-09-27"),
    );
  });

  it("keeps every item exactly once", () => {
    expect(seededShuffle(albums, "2026-09-27").toSorted()).toEqual(
      albums.toSorted(),
    );
  });

  it("leaves its input alone", () => {
    const input = [...albums];
    seededShuffle(input, "2026-09-27");
    expect(input).toEqual(albums);
  });

  it("changes the order across a week of seeds", () => {
    const orders = new Set(
      ["21", "22", "23", "24", "25", "26", "27"].map((d) =>
        seededShuffle(albums, `2026-09-${d}`).join("|"),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("pins a known order, so a change to the generator is deliberate", () => {
    expect(seededShuffle(albums, "2026-09-28")).toMatchInlineSnapshot(`
      [
        "In Rainbows",
        "Promises",
        "Acquired",
        "Hard Fork",
        "Blonde",
      ]
    `);
  });

  it("handles no items and one item", () => {
    expect(seededShuffle([], "x")).toEqual([]);
    expect(seededShuffle(["only"], "x")).toEqual(["only"]);
  });
});

describe("utcDay", () => {
  it("uses the UTC calendar day, not the local one", () => {
    expect(utcDay(new Date("2026-09-27T23:30:00-07:00"))).toBe("2026-09-28");
  });
});

describe("dayShuffle", () => {
  it("holds one order all UTC day", () => {
    expect(dayShuffle(albums, new Date("2026-09-27T00:00:01Z"))).toEqual(
      dayShuffle(albums, new Date("2026-09-27T23:59:59Z")),
    );
  });
});

describe("secondsUntilUtcMidnight", () => {
  it("counts the seconds left in the UTC day", () => {
    expect(secondsUntilUtcMidnight(new Date("2026-09-27T23:59:00Z"))).toBe(60);
    expect(secondsUntilUtcMidnight(new Date("2026-09-27T00:00:00Z"))).toBe(
      86_400,
    );
  });
});
