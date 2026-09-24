// What a climb is called, read from OpenStreetMap around its summit. A named
// peak is the name a rider uses for a climb that tops out on a mountain, and
// the road is the name for one that crests a ridge or a pass on the way
// somewhere else. Anything past those is guessing, so the rest go unnamed.
import { logger } from "@workspace/logger";
import { z } from "zod";
import type { Coordinate } from "./types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "bendrucker.me (+https://bendrucker.me)";
const TIMEOUT_MS = 8000;

/** How far a peak may stand from the summit and still name it, in metres. */
const PEAK_RADIUS_M = 1000;

/** How far the summit may sit from a road's line, in metres. */
const ROAD_RADIUS_M = 60;

const EARTH_RADIUS_M = 6_371_000;
const DEGREES_TO_RADIANS = Math.PI / 180;

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
  const peak = nearest(
    elements.flatMap((item) =>
      item.type === "node" &&
      item.tags?.name !== undefined &&
      (item.tags.natural === "peak" || item.tags.mountain_pass === "yes")
        ? [
            {
              name: item.tags.name,
              distance: metresBetween(summit, [item.lat, item.lon]),
            },
          ]
        : [],
    ),
    PEAK_RADIUS_M,
  );
  if (peak !== null) return peak.replace(DIRECTIONAL_PEAK, "");

  const road = nearest(
    elements.flatMap((item) =>
      item.type === "way" &&
      item.tags?.name !== undefined &&
      ROAD_CLASSES.has(item.tags.highway ?? "")
        ? [
            {
              name: item.tags.name,
              distance: distanceToLine(
                summit,
                item.geometry.flatMap((node): Coordinate[] =>
                  node === null ? [] : [[node.lat, node.lon]],
                ),
              ),
            },
          ]
        : [],
    ),
    ROAD_RADIUS_M,
  );
  return road?.replace(/ Road$/, "") ?? null;
}

/**
 * One Overpass request for every summit on a ride, so a publish costs one
 * call to a shared public server however many climbs it holds. Any failure
 * leaves every climb unnamed: a climb without a name falls back to its ride's, and a
 * publish must never fail because OpenStreetMap was busy.
 */
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

/**
 * Metres east and north of `origin`. Every distance here is under a
 * kilometre, where a flat projection is off by less than a rounding error.
 */
function project(origin: Coordinate, target: Coordinate): [number, number] {
  return [
    (target[1] - origin[1]) *
      DEGREES_TO_RADIANS *
      EARTH_RADIUS_M *
      Math.cos(origin[0] * DEGREES_TO_RADIANS),
    (target[0] - origin[0]) * DEGREES_TO_RADIANS * EARTH_RADIUS_M,
  ];
}

function metresBetween(a: Coordinate, b: Coordinate): number {
  return Math.hypot(...project(a, b));
}

/** From `origin` to the closest point on the polyline through `line`. */
function distanceToLine(origin: Coordinate, line: Coordinate[]): number {
  const points = line.map((node) => project(origin, node));
  if (points.length === 1) return Math.hypot(...points[0]!);
  let closest = Number.POSITIVE_INFINITY;
  for (let index = 1; index < points.length; index++) {
    const [ax, ay] = points[index - 1]!;
    const [bx, by] = points[index]!;
    const dx = bx - ax;
    const dy = by - ay;
    const length = dx * dx + dy * dy;
    const along =
      length === 0
        ? 0
        : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / length));
    closest = Math.min(closest, Math.hypot(ax + along * dx, ay + along * dy));
  }
  return closest;
}
