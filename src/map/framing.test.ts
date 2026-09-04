// The basemap and the route line are drawn by different machines from the same
// stored track: the worker rasterizes the tiles, the browser strokes the path
// over them. They agree only because both frame the same points through the
// same `fitRoute`. If that ever stops holding, the line lands beside the roads
// it is supposed to follow, on every card, with nothing failing loudly.
import { describe, expect, it } from "vitest";
import {
  decodePolyline,
  encodePolyline,
  MAX_ROUTE_POINTS,
  thinPolyline,
  thinTrack,
} from "@/activity/track";
import { RIDE_MAP } from "@/components/cycling/basemap";
import { fitRoute } from "@/components/cycling/geo";
import type { Coordinate } from "@/activity/types";

/** What the browser draws: `Ride.route` as the feed stored it, decoded. */
function clientFraming(polyline: string) {
  return fitRoute(
    decodePolyline(thinPolyline(polyline)),
    RIDE_MAP.width,
    RIDE_MAP.height,
  );
}

/** What the worker renders: the same column, read back through the route. */
function workerFraming(polyline: string) {
  return fitRoute(
    thinTrack(polyline).coordinates,
    RIDE_MAP.width,
    RIDE_MAP.height,
  );
}

/** A track that climbs steadily, so thinning has to drop interior points. */
function track(points: number): string {
  const coordinates: Coordinate[] = [];
  for (let i = 0; i < points; i++) {
    coordinates.push([37.7 + i * 0.0004, -122.5 + i * 0.0006]);
  }
  return encodePolyline(coordinates);
}

describe.each([
  { name: "a track short enough to store whole", points: 12 },
  { name: "a track at the thinning boundary", points: MAX_ROUTE_POINTS },
  { name: "a track long enough to be thinned and re-encoded", points: 900 },
])("$name", ({ points }) => {
  const polyline = track(points);

  it("frames the worker's basemap on the browser's points", () => {
    expect(workerFraming(polyline).tiles).toEqual(
      clientFraming(polyline).tiles,
    );
  });

  it("puts the route line in the same place both ways", () => {
    expect(workerFraming(polyline).path).toBe(clientFraming(polyline).path);
  });

  // Thinning re-encodes, and encoding quantizes to five decimals. The points
  // came out of a decode at that precision already, so the round trip has to
  // land exactly rather than merely close, or the two framings drift apart.
  it("survives the re-encode without moving a point", () => {
    expect(thinTrack(polyline).coordinates).toEqual(
      decodePolyline(thinPolyline(polyline)),
    );
  });
});
