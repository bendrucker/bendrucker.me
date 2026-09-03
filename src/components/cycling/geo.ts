import { decodePolyline, MAX_ROUTE_POINTS, thin } from "@/activity/track";
import type { Coordinate } from "@/activity/types";

export { decodePolyline };

const EARTH_RADIUS_MI = 3959;
const DEGREES_TO_RADIANS = Math.PI / 180;

export const TILE_SIZE = 256;

/** Zoom 0 is one tile for the whole world, so the fit loop always terminates. */
const MIN_ZOOM = 0;
const MAX_ZOOM = 15;
const VIEWPORT_PADDING = 12;

export function haversineMiles(a: Coordinate, b: Coordinate): number {
  const latDelta = (b[0] - a[0]) * DEGREES_TO_RADIANS;
  const lonDelta = (b[1] - a[1]) * DEGREES_TO_RADIANS;
  const chord =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(a[0] * DEGREES_TO_RADIANS) *
      Math.cos(b[0] * DEGREES_TO_RADIANS) *
      Math.sin(lonDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(chord));
}

export interface MapTile {
  key: string;
  z: number;
  x: number;
  y: number;
  left: number;
  top: number;
}

export interface FittedRoute {
  tiles: MapTile[];
  path: string;
  zoom: number;
}

/**
 * The latitude where Web Mercator's projection reaches a square world. Beyond
 * it the formula runs to infinity, and at exactly ±90 it divides by zero.
 */
const MERCATOR_LATITUDE_LIMIT = 85.05112878;

/** Web Mercator pixel position at a zoom level, origin at the top left tile. */
function project(lat: number, lon: number, zoom: number): [number, number] {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const clamped = Math.min(
    MERCATOR_LATITUDE_LIMIT,
    Math.max(-MERCATOR_LATITUDE_LIMIT, lat),
  );
  const radians = clamped * DEGREES_TO_RADIANS;
  const y =
    (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
  return [((lon + 180) / 360) * worldSize, y * worldSize];
}

/**
 * Rewrites longitudes so each step is the short way around. A ride across the
 * antimeridian arrives as 179.9 then -179.9, which reads as most of the globe
 * unless the second value is carried past 180 instead of wrapping.
 */
function unwrapLongitudes(coordinates: Coordinate[]): Coordinate[] {
  let offset = 0;
  return coordinates.map((coordinate, index) => {
    if (index > 0) {
      const delta = coordinate[1] - coordinates[index - 1][1];
      if (delta > 180) offset -= 360;
      else if (delta < -180) offset += 360;
    }
    return [coordinate[0], coordinate[1] + offset] as Coordinate;
  });
}

export function fitRoute(
  coordinates: Coordinate[],
  width: number,
  height: number,
): FittedRoute {
  if (coordinates.length < 2) return { tiles: [], path: "", zoom: 0 };

  const unwrapped = unwrapLongitudes(coordinates);

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const [lat, lon] of unwrapped) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  // A viewport smaller than the padding would leave nothing to fit into, so
  // hold the available extent at one pixel rather than letting it go negative.
  const fitWidth = Math.max(1, width - 2 * VIEWPORT_PADDING);
  const fitHeight = Math.max(1, height - 2 * VIEWPORT_PADDING);

  // Zoom out until the bounds fit the padded viewport. The north west corner
  // projects to the smallest pixel coordinates, the south east to the largest.
  let zoom = MAX_ZOOM;
  for (; zoom > MIN_ZOOM; zoom--) {
    const [left, top] = project(maxLat, minLon, zoom);
    const [right, bottom] = project(minLat, maxLon, zoom);
    if (right - left <= fitWidth && bottom - top <= fitHeight) break;
  }

  const [left, top] = project(maxLat, minLon, zoom);
  const [right, bottom] = project(minLat, maxLon, zoom);
  const originX = (left + right) / 2 - width / 2;
  const originY = (top + bottom) / 2 - height / 2;

  const tilesPerAxis = 2 ** zoom;
  const tiles: MapTile[] = [];
  for (
    let x = Math.floor(originX / TILE_SIZE);
    x <= Math.floor((originX + width) / TILE_SIZE);
    x++
  ) {
    for (
      let y = Math.floor(originY / TILE_SIZE);
      y <= Math.floor((originY + height) / TILE_SIZE);
      y++
    ) {
      // Latitude does not wrap, so rows outside the grid have no tile to
      // request. Longitude does, so columns wrap around the antimeridian.
      if (y < 0 || y >= tilesPerAxis) continue;
      const wrappedX = ((x % tilesPerAxis) + tilesPerAxis) % tilesPerAxis;
      tiles.push({
        key: `${zoom}_${x}_${y}`,
        z: zoom,
        x: wrappedX,
        y,
        left: Math.round(x * TILE_SIZE - originX),
        top: Math.round(y * TILE_SIZE - originY),
      });
    }
  }

  const path = thin(unwrapped, MAX_ROUTE_POINTS)
    .map(([lat, lon], position) => {
      const [x, y] = project(lat, lon, zoom);
      const command = position === 0 ? "M" : "L";
      return `${command}${(x - originX).toFixed(1)} ${(y - originY).toFixed(1)}`;
    })
    .join("");

  return { tiles, path, zoom };
}
