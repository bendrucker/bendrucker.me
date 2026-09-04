import { describe, expect, it } from "vitest";
import { TILE_SIZE, type MapTile } from "@/components/cycling/geo";
import { placeTile, project, SOURCE_MAX_ZOOM } from "./tiles";

const EXTENT = 4096;

function tile(partial: Partial<MapTile> & Pick<MapTile, "z" | "x" | "y">) {
  return { key: "", left: 0, top: 0, ...partial };
}

describe("placeTile", () => {
  it("reads a tile within the source's zoom range from itself", () => {
    const placement = placeTile(
      tile({ z: SOURCE_MAX_ZOOM, x: 3, y: 7, left: 5, top: 6 }),
    );
    expect(placement).toMatchObject({
      z: SOURCE_MAX_ZOOM,
      x: 3,
      y: 7,
      offsetX: 5,
      offsetY: 6,
      sub: 1,
    });
  });

  // `fitRoute` frames a short ride at zoom 15, one past what CARTO publishes.
  it("reads an overzoomed tile from its parent", () => {
    const placement = placeTile(
      tile({ z: SOURCE_MAX_ZOOM + 1, x: 5, y: 9, left: 10, top: 20 }),
    );
    expect(placement).toMatchObject({ z: SOURCE_MAX_ZOOM, x: 2, y: 4, sub: 2 });
  });

  it("gives siblings of one parent the same source", () => {
    const keys = [
      [4, 8],
      [5, 8],
      [4, 9],
      [5, 9],
    ].map(
      ([x, y]) => placeTile(tile({ z: SOURCE_MAX_ZOOM + 1, x: x!, y: y! })).key,
    );
    expect(new Set(keys).size).toBe(1);
  });

  it("separates tiles that do not share a parent", () => {
    const left = placeTile(tile({ z: SOURCE_MAX_ZOOM + 1, x: 5, y: 9 })).key;
    const right = placeTile(tile({ z: SOURCE_MAX_ZOOM + 1, x: 6, y: 9 })).key;
    expect(left).not.toBe(right);
  });
});

describe("project", () => {
  it("maps a tile's own extent onto its box", () => {
    const box = { z: SOURCE_MAX_ZOOM, x: 3, y: 7, left: 5, top: 6 };
    const toCard = project(placeTile(tile(box)), EXTENT);
    expect(toCard(0, 0)).toEqual([5, 6]);
    expect(toCard(EXTENT, EXTENT)).toEqual([5 + TILE_SIZE, 6 + TILE_SIZE]);
  });

  // Only the parent's matching quadrant belongs in the box, blown up to fill
  // it. Getting this wrong smears the whole parent across the card.
  it("maps only the overzoomed tile's quadrant onto its box", () => {
    const box = { z: SOURCE_MAX_ZOOM + 1, x: 5, y: 9, left: 10, top: 20 };
    const toCard = project(placeTile(tile(box)), EXTENT);
    expect(toCard(EXTENT / 2, EXTENT / 2)).toEqual([10, 20]);
    expect(toCard(EXTENT, EXTENT)).toEqual([10 + TILE_SIZE, 20 + TILE_SIZE]);
  });

  it("puts the parent's other quadrant outside the box", () => {
    const box = { z: SOURCE_MAX_ZOOM + 1, x: 5, y: 9, left: 10, top: 20 };
    const toCard = project(placeTile(tile(box)), EXTENT);
    expect(toCard(0, 0)).toEqual([10 - TILE_SIZE, 20 - TILE_SIZE]);
  });
});
