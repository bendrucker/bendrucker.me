// What a climb is called, read from OpenStreetMap around its summit.
import { logger } from "@workspace/logger";
import CheapRuler from "cheap-ruler";
import { z } from "zod";
import type { Coordinate } from "./types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "bendrucker.me (+https://bendrucker.me)";
const TIMEOUT_MS = 8000;

/** How far a peak may stand from the summit and still name it, in metres. */
const PEAK_RADIUS_M = 1000;

const ROAD_RADIUS_M = 60;

/**
 * Classes a car could drive. A fire trail or a path crossing the summit is
 * usually not the way the ride came up, and naming the climb after it reads
 * as a trail most readers have never heard of.
 */
const ROAD_CLASSES = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "tertiary",
  "tertiary_link",
  "unclassified",
  "residential",
  "living_street",
  "road",
]);

/** "Mount Tamalpais West Peak" is Mount Tamalpais to anyone riding it. */
const DIRECTIONAL_PEAK = / (North|South|East|West|Middle) Peak$/;

const point = z.object({ lat: z.number(), lon: z.number() });
const tags = z.record(z.string(), z.string()).optional();

const element = z.discriminatedUnion("type", [
  z.object({ type: z.literal("node"), lat: z.number(), lon: z.number(), tags }),
  z.object({
    type: z.literal("way"),
    // Overpass writes null for a node outside the area it loaded.
    geometry: z.array(point.nullable()).default([]),
    tags,
  }),
]);

const overpassResponse = z.object({
  elements: z.array(z.unknown()).transform((elements) =>
    elements.flatMap((item) => {
      const parsed = element.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }),
  ),
});

export type OverpassElement = z.infer<typeof element>;

/** Names for each summit in order, null where nothing fit. */
export type ClimbNamer = (summits: Coordinate[]) => Promise<(string | null)[]>;

/**
 * The nearest named peak or pass within `PEAK_RADIUS_M`, else the nearest
 * named road within `ROAD_RADIUS_M` less its "Road", else null. `elements`
 * may hold features gathered for other summits too, so every distance is
 * checked here.
 */
export function pickClimbName(
  elements: OverpassElement[],
  summit: Coordinate,
): string | null {
  // Every distance here is under a kilometre, where a flat projection is off
  // by less than a rounding error.
  const ruler = new CheapRuler(summit[0], "meters");
  const at = lngLat(summit);

  const peak = nearest(
    elements.flatMap((item) =>
      item.type === "node" &&
      item.tags?.name !== undefined &&
      (item.tags.natural === "peak" || item.tags.mountain_pass === "yes")
        ? [
            {
              name: item.tags.name,
              distance: ruler.distance(at, [item.lon, item.lat]),
            },
          ]
        : [],
    ),
    PEAK_RADIUS_M,
  );
  if (peak !== null) return peak.replace(DIRECTIONAL_PEAK, "");

  const road = nearest(
    elements.flatMap((item) => {
      if (
        item.type !== "way" ||
        item.tags?.name === undefined ||
        !ROAD_CLASSES.has(item.tags.highway ?? "")
      ) {
        return [];
      }
      const line = item.geometry.flatMap((node): [number, number][] =>
        node === null ? [] : [[node.lon, node.lat]],
      );
      if (line.length === 0) return [];
      const closest = ruler.pointOnLine(line, at).point;
      return [{ name: item.tags.name, distance: ruler.distance(at, closest) }];
    }),
    ROAD_RADIUS_M,
  );
  return road?.replace(/ Road$/, "") ?? null;
}

/** Names every summit on a ride from one Overpass request, or none if it fails. */
export async function lookupClimbNames(
  summits: Coordinate[],
  fetcher: typeof fetch = fetch,
): Promise<(string | null)[]> {
  if (summits.length === 0) return [];
  try {
    const response = await fetcher(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: new URLSearchParams({ data: overpassQuery(summits) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Overpass answered ${response.status}`);
    }
    const { elements } = overpassResponse.parse(await response.json());
    return summits.map((summit) => pickClimbName(elements, summit));
  } catch (error) {
    logger.warn({ error, summits: summits.length }, "Climb naming failed");
    return summits.map(() => null);
  }
}

export function overpassQuery(summits: Coordinate[]): string {
  const clauses = summits.flatMap(([lat, lng]) => [
    `node(around:${PEAK_RADIUS_M},${lat},${lng})["natural"="peak"]["name"];`,
    `node(around:${PEAK_RADIUS_M},${lat},${lng})["mountain_pass"="yes"]["name"];`,
    `way(around:${ROAD_RADIUS_M},${lat},${lng})["highway"]["name"];`,
  ]);
  return `[out:json][timeout:${TIMEOUT_MS / 1000}];(${clauses.join("")});out geom;`;
}

function nearest(
  candidates: { name: string; distance: number }[],
  radius: number,
): string | null {
  let best: { name: string; distance: number } | null = null;
  for (const candidate of candidates) {
    if (candidate.distance > radius) continue;
    if (best === null || candidate.distance < best.distance) best = candidate;
  }
  return best?.name ?? null;
}

/** cheap-ruler takes longitude first. */
function lngLat([lat, lng]: Coordinate): [number, number] {
  return [lng, lat];
}
