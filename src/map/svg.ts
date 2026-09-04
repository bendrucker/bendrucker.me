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

/**
 * Cards are small enough that a 1x basemap is visibly soft on a phone. The SVG
 * is built in card pixels and rasterized at twice that, which costs nothing
 * extra to ask for here.
 */
const RENDER_SCALE = 2;

/** Geometry types from the vector tile spec. Points carry no shape to draw. */
const LINE_GEOMETRY = 2;
const POLYGON_GEOMETRY = 3;

export interface BasemapRequest {
  coordinates: Coordinate[];
  width: number;
  height: number;
  theme: Theme;
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
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width * RENDER_SCALE}" height="${height * RENDER_SCALE}" viewBox="0 0 ${width} ${height}">`,
    `<defs>${clips}</defs>`,
    `<rect width="${width}" height="${height}" fill="${background(theme)}"/>`,
    ...paintRules(theme).map((rule) => layerGroup(rule, placed)),
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
function layerGroup(rule: PaintRule, placed: PlacedTile[]): string {
  const wanted = rule.kind === "fill" ? POLYGON_GEOMETRY : LINE_GEOMETRY;

  const paths = placed
    .map(({ clipId, placement, source }) => {
      const layer = source?.layer(rule.layer);
      if (layer === undefined) return "";

      const toCard = project(placement, layer.extent);
      const data = layer.features
        .filter(
          (feature) => feature.type === wanted && matchesClass(rule, feature),
        )
        .map((feature) => pathData(feature, toCard, rule.kind === "fill"))
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

function matchesClass(rule: PaintRule, feature: DecodedFeature): boolean {
  if (rule.classes === undefined) return true;
  return feature.class !== undefined && rule.classes.includes(feature.class);
}

function pathData(
  feature: DecodedFeature,
  toCard: (x: number, y: number) => [number, number],
  close: boolean,
): string {
  let data = "";
  for (const ring of feature.rings) {
    for (const [index, point] of ring.entries()) {
      const [x, y] = toCard(point.x, point.y);
      data += `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`;
    }
    if (close && ring.length > 0) data += "Z";
  }
  return data;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
