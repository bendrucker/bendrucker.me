import { fitRoute, TILE_SIZE, type MapTile } from "@/components/cycling/geo";
import type { Coordinate } from "@/activity/types";
import { background, paintRules, type PaintRule, type Theme } from "./style";
import {
  fetchTile,
  placeTile,
  project,
  type DecodedFeature,
  type DecodedTile,
  type TilePlacement,
} from "./tiles";

/** Geometry types from the vector tile spec. Points carry no shape to draw. */
const LINE_GEOMETRY = 2;
const POLYGON_GEOMETRY = 3;

export interface BasemapRequest {
  coordinates: Coordinate[];
  /** CSS pixels. `fitRoute` frames and zooms on these, never on `scale`. */
  width: number;
  height: number;
  theme: Theme;
  /**
   * Cards are small enough that a 1x basemap is visibly soft on a phone, so
   * the route also serves a 2x raster of the same card for the browser to
   * pick via `srcset`. Only the root `<svg>` element's `width`/`height` scale
   * with this. The `viewBox`, the background rect, and every projected path
   * stay in card pixels, so the two scales show the same map.
   */
  scale: 1 | 2;
  key?: string;
}

/** One tile of the fitted grid, with the source geometry that fills it. */
interface PlacedTile {
  clipId: string;
  box: MapTile;
  placement: TilePlacement;
  source: DecodedTile | null;
}

export async function basemapSvg({
  coordinates,
  width,
  height,
  theme,
  scale,
  key,
}: BasemapRequest): Promise<string> {
  const placed = await placeTiles(coordinates, width, height, key);

  const clips = placed
    .map(
      ({ clipId, box }) =>
        `<clipPath id="${clipId}"><rect x="${box.left}" y="${box.top}" width="${TILE_SIZE}" height="${TILE_SIZE}"/></clipPath>`,
    )
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">`,
    `<defs>${clips}</defs>`,
    `<rect width="${width}" height="${height}" fill="${background(theme)}"/>`,
    ...paintRules(theme).map((rule) => layerGroup(rule, placed, width, height)),
    `</svg>`,
  ].join("");
}

async function placeTiles(
  coordinates: Coordinate[],
  width: number,
  height: number,
  key?: string,
): Promise<PlacedTile[]> {
  const { tiles } = fitRoute(coordinates, width, height);
  const placements = tiles.map((tile) => placeTile(tile));

  // Overzoomed tiles share a source tile with their siblings, so the fetch is
  // keyed by the source tile.
  const sources = new Map<string, Promise<DecodedTile | null>>();
  for (const placement of placements) {
    if (!sources.has(placement.key)) {
      sources.set(placement.key, fetchTile(placement, key));
    }
  }
  const decoded = new Map(
    await Promise.all(
      [...sources].map(async ([id, pending]) => [id, await pending] as const),
    ),
  );

  return placements.map((placement, index) => ({
    clipId: `t${index}`,
    box: tiles[index]!,
    placement,
    source: decoded.get(placement.key) ?? null,
  }));
}

/**
 * One rule across every tile. Rules are the outer loop so a tile's water
 * cannot land on top of the roads its neighbour already drew.
 */
function layerGroup(
  rule: PaintRule,
  placed: PlacedTile[],
  width: number,
  height: number,
): string {
  const wanted = rule.kind === "fill" ? POLYGON_GEOMETRY : LINE_GEOMETRY;
  const reach = rule.kind === "line" ? rule.width / 2 : 0;

  const paths = placed
    .map(({ clipId, box, placement, source }) => {
      const layer = source?.layer(rule.layer);
      if (layer === undefined) return "";

      const toCard = project(placement, layer.extent);
      const visible = visibleBounds(box, width, height, reach);
      const data = layer.features
        .filter(
          (feature) => feature.type === wanted && matchesClass(rule, feature),
        )
        .map((feature) =>
          pathData(feature, toCard, rule.kind === "fill", visible),
        )
        .join("");

      return data === ""
        ? ""
        : `<path clip-path="url(#${clipId})" d="${data}"/>`;
    })
    .join("");

  if (paths === "") return "";

  const paint =
    rule.kind === "fill"
      ? `fill="${rule.fill}" fill-rule="evenodd" stroke="none"`
      : `fill="none" stroke="${rule.stroke}" stroke-width="${rule.width}" stroke-linecap="round" stroke-linejoin="round"`;

  return `<g ${paint}>${paths}</g>`;
}

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * The part of the card a tile's clip lets it paint, widened by how far a
 * stroke reaches past its own geometry.
 */
function visibleBounds(
  box: MapTile,
  width: number,
  height: number,
  reach: number,
): Bounds {
  return {
    left: Math.max(box.left, 0) - reach,
    top: Math.max(box.top, 0) - reach,
    right: Math.min(box.left + TILE_SIZE, width) + reach,
    bottom: Math.min(box.top + TILE_SIZE, height) + reach,
  };
}

function matchesClass(rule: PaintRule, feature: DecodedFeature): boolean {
  if (rule.classes === undefined) return true;
  return feature.class !== undefined && rule.classes.includes(feature.class);
}

/**
 * Out-of-bounds features are dropped rather than left to the clip: resvg
 * panics with `unreachable` on some clipped paths that lie wholly off the
 * canvas, and the route answers 500.
 */
function pathData(
  feature: DecodedFeature,
  toCard: (x: number, y: number) => [number, number],
  close: boolean,
  visible: Bounds,
): string {
  const rings = feature.rings.map((ring) =>
    ring.map((point) => toCard(point.x, point.y)),
  );
  if (!reaches(rings.flat(), visible)) return "";

  let data = "";
  for (const ring of rings) {
    for (const [index, [x, y]] of ring.entries()) {
      data += `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`;
    }
    if (close && ring.length > 0) data += "Z";
  }
  return data;
}

function reaches(points: Array<[number, number]>, visible: Bounds): boolean {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const [x, y] of points) {
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  return (
    right >= visible.left &&
    left <= visible.right &&
    bottom >= visible.top &&
    top <= visible.bottom
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
