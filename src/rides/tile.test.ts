import { describe, expect, it } from "vitest";
import { encodePolyline } from "@/activity/track";
import { routeTilePath, TILE_SIZE } from "./tile";

function coordinates(path: string): number[][] {
  return [...path.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ]);
}

describe("routeTilePath", () => {
  it("fits the track inside the padded tile", () => {
    const path = routeTilePath(
      encodePolyline([
        [37.8, -122.5],
        [37.9, -122.4],
        [37.85, -122.3],
      ]),
    );
    const points = coordinates(path ?? "");
    expect(points.length).toBe(3);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(6);
      expect(x).toBeLessThanOrEqual(TILE_SIZE - 6);
      expect(y).toBeGreaterThanOrEqual(6);
      expect(y).toBeLessThanOrEqual(TILE_SIZE - 6);
    }
    // The longer side spans the whole inner box.
    const xs = points.map(([x]) => x ?? 0);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(TILE_SIZE - 12, 0);
  });

  it("puts north at the top", () => {
    const path = routeTilePath(
      encodePolyline([
        [37.8, -122.4],
        [37.9, -122.4],
      ]),
    );
    const [south, north] = coordinates(path ?? "");
    expect(north?.[1]).toBeLessThan(south?.[1] ?? 0);
  });

  it("drops points a tile cannot show", () => {
    const straight = Array.from(
      { length: 200 },
      (_, index): [number, number] => [
        37.8 + index * 0.001,
        -122.4 + index * 0.001,
      ],
    );
    expect(
      coordinates(routeTilePath(encodePolyline(straight)) ?? ""),
    ).toHaveLength(2);
  });

  it("draws nothing for a single point", () => {
    expect(routeTilePath(encodePolyline([[37.8, -122.4]]))).toBeNull();
    expect(
      routeTilePath(
        encodePolyline([
          [37.8, -122.4],
          [37.8, -122.4],
        ]),
      ),
    ).toBeNull();
  });
});
