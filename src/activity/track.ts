// What a ride's recorded track becomes on the way into the feed. The hub
// publishes every point the head unit logged, which is far more than a card
// can draw and, across a season, more than a request can hold in memory. The
// write side thins each track once, so the read side never sees the full one.
import type { Coordinate } from "./types";

/** Points a stored route keeps. A card's map is too small to show more. */
export const MAX_ROUTE_POINTS = 300;

/** Samples a stored profile keeps. A card's chart draws at a width where more is invisible. */
export const MAX_PROFILE_SAMPLES = 100;

/**
 * Every `step`th item plus the last, so a long series keeps its shape and
 * both endpoints within a bounded size.
 */
export function thin<T>(items: readonly T[], max: number): T[] {
  const step = Math.max(1, Math.ceil(items.length / max));
  const kept: T[] = [];
  let lastKept = -1;
  for (let i = 0; i < items.length; i += step) {
    kept.push(items[i]!);
    lastKept = i;
  }
  if (items.length > 0 && lastKept !== items.length - 1) {
    kept.push(items[items.length - 1]!);
  }
  return kept;
}

/** The encoded route with at most `MAX_ROUTE_POINTS`, untouched when already within it. */
export function thinPolyline(encoded: string): string {
  const coordinates = decodePolyline(encoded);
  if (coordinates.length <= MAX_ROUTE_POINTS) return encoded;
  return encodePolyline(thin(coordinates, MAX_ROUTE_POINTS));
}

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

/** The inverse of `decodePolyline`, at the same five-decimal precision. */
export function encodePolyline(coordinates: readonly Coordinate[]): string {
  let output = "";
  let lastLat = 0;
  let lastLon = 0;
  for (const [lat, lon] of coordinates) {
    const latE5 = Math.round(lat * 1e5);
    const lonE5 = Math.round(lon * 1e5);
    output += encodeDelta(latE5 - lastLat) + encodeDelta(lonE5 - lastLon);
    lastLat = latE5;
    lastLon = lonE5;
  }
  return output;
}

// Zig-zag the sign into bit 0, then emit five bits at a time with bit 6 set on
// every group but the last, each offset by 63 to stay printable.
function encodeDelta(delta: number): string {
  let value = delta < 0 ? ~(delta << 1) : delta << 1;
  let output = "";
  while (value >= 32) {
    output += String.fromCharCode((32 | (value & 31)) + 63);
    value >>= 5;
  }
  return output + String.fromCharCode(value + 63);
}
