// A route tile's line: the ride's track fitted into a square and simplified to
// what that square can show. The Routes view draws two dozen of these inline,
// so each is trimmed server-side to a few hundred bytes of path data rather
// than shipping the polyline for the browser to project.
import simplify from "simplify-js";
import { decodePolyline } from "@/activity/track";

/** The tile's `viewBox` edge, in the SVG's own units. */
export const TILE_SIZE = 132;

/** Space kept clear between the line and the tile's edge. */
const TILE_PAD = 6;

/**
 * How far a point may sit from the simplified line before it is kept, in tile
 * units. A tile renders at about its `viewBox` size, so this is under a pixel.
 */
const TOLERANCE = 0.6;

interface Point {
  x: number;
  y: number;
}

/** Web Mercator, unscaled: what a map would draw the track as. */
function project([lat, lon]: [number, number]): Point {
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: lon / 360,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI),
  };
}

/**
 * The encoded polyline as SVG path data inside a `size` square, centred on
 * its longer side, or null for a track with fewer than two points.
 */
export function routeTilePath(
  encoded: string,
  size = TILE_SIZE,
): string | null {
  const points = decodePolyline(encoded).map((coordinate) =>
    project(coordinate),
  );
  if (points.length < 2) return null;

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX;
  const height = Math.max(...ys) - minY;
  const span = Math.max(width, height);
  if (span === 0) return null;

  const inner = size - TILE_PAD * 2;
  const scale = inner / span;
  const offsetX = TILE_PAD + (inner - width * scale) / 2;
  const offsetY = TILE_PAD + (inner - height * scale) / 2;
  const fitted = points.map((point) => ({
    x: offsetX + (point.x - minX) * scale,
    y: offsetY + (point.y - minY) * scale,
  }));

  return simplify(fitted, TOLERANCE, true)
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join("");
}
