import type { Coordinate } from "./types";

const EARTH_RADIUS_MI = 3959;
const DEGREES_TO_RADIANS = Math.PI / 180;

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 15;
const VIEWPORT_PADDING = 12;
const MAX_PATH_POINTS = 300;

export const TILE_URL_TEMPLATE =
  "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png";

export function decodePolyline(encoded: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  /**
   * Reads one delta, or null once the input runs out mid-value. Each delta is a
   * chain of five-bit groups, least significant first, offset by 63 to stay
   * printable. Bit 6 signals another group follows, and the assembled value is
   * zig-zag encoded: bit 0 marks a negative stored as its complement.
   */
  const readDelta = (): number | null => {
    let shift = 0;
    let result = 0;
    let group: number;
    do {
      if (index >= encoded.length) return null;
      group = encoded.charCodeAt(index++) - 63;
      result |= (group & 31) << shift;
      shift += 5;
    } while (group >= 32);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    const latDelta = readDelta();
    if (latDelta === null) break;
    const lonDelta = readDelta();
    if (lonDelta === null) break;
    lat += latDelta;
    lon += lonDelta;
    coordinates.push([lat / 1e5, lon / 1e5]);
  }

  return coordinates;
}

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
  url: string;
  left: number;
  top: number;
}

export interface FittedRoute {
  tiles: MapTile[];
  path: string;
  zoom: number;
}

/** Web Mercator pixel position at a zoom level, origin at the top left tile. */
function project(lat: number, lon: number, zoom: number): [number, number] {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const radians = lat * DEGREES_TO_RADIANS;
  const y =
    (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
  return [((lon + 180) / 360) * worldSize, y * worldSize];
}

function tileUrl(zoom: number, x: number, y: number): string {
  return TILE_URL_TEMPLATE.replace("{z}", String(zoom))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

export function fitRoute(
  coordinates: Coordinate[],
  width: number,
  height: number,
): FittedRoute {
  if (coordinates.length < 2) return { tiles: [], path: "", zoom: 0 };

  let minLat = 90;
  let maxLat = -90;
  let minLon = 180;
  let maxLon = -180;
  for (const [lat, lon] of coordinates) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }

  // Zoom out until the bounds fit the padded viewport. The north west corner
  // projects to the smallest pixel coordinates, the south east to the largest.
  let zoom = MAX_ZOOM;
  for (; zoom > MIN_ZOOM; zoom--) {
    const [left, top] = project(maxLat, minLon, zoom);
    const [right, bottom] = project(minLat, maxLon, zoom);
    if (
      right - left <= width - 2 * VIEWPORT_PADDING &&
      bottom - top <= height - 2 * VIEWPORT_PADDING
    ) {
      break;
    }
  }

  const [left, top] = project(maxLat, minLon, zoom);
  const [right, bottom] = project(minLat, maxLon, zoom);
  const originX = (left + right) / 2 - width / 2;
  const originY = (top + bottom) / 2 - height / 2;

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
      tiles.push({
        key: `${x}_${y}`,
        url: tileUrl(zoom, x, y),
        left: Math.round(x * TILE_SIZE - originX),
        top: Math.round(y * TILE_SIZE - originY),
      });
    }
  }

  const step = Math.max(1, Math.floor(coordinates.length / MAX_PATH_POINTS));
  const sampled: number[] = [];
  for (let i = 0; i < coordinates.length; i += step) sampled.push(i);
  const lastIndex = coordinates.length - 1;
  if (sampled[sampled.length - 1] !== lastIndex) sampled.push(lastIndex);

  const path = sampled
    .map((index, position) => {
      const [lat, lon] = coordinates[index];
      const [x, y] = project(lat, lon, zoom);
      const command = position === 0 ? "M" : "L";
      return `${command}${(x - originX).toFixed(1)} ${(y - originY).toFixed(1)}`;
    })
    .join("");

  return { tiles, path, zoom };
}
