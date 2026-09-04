import { VectorTile, type VectorTileLayer } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { TILE_SIZE, type MapTile } from "@/components/cycling/geo";

const TILE_URL =
  "https://tiles.basemaps.cartocdn.com/vectortiles/carto.streets/v1";

/**
 * The deepest zoom CARTO's vector source publishes. `fitRoute` frames a short
 * ride as deep as 15, so those tiles come from their zoom 14 ancestor and get
 * drawn at twice the size.
 */
export const SOURCE_MAX_ZOOM = 14;

/**
 * A month. Basemap geometry moves slowly, and the whole point of holding tiles
 * at the edge is that a render already paid for does not go back to CARTO.
 */
const TILE_CACHE_SECONDS = 2592000;

export interface DecodedTile {
  layer(name: string): DecodedLayer | undefined;
}

export interface DecodedLayer {
  /** Geometry runs 0..extent on each axis. 4096 in practice. */
  extent: number;
  features: DecodedFeature[];
}

export interface DecodedFeature {
  /** OpenMapTiles puts the layer's subtype here. Absent on some features. */
  class?: string;
  /** 1 point, 2 line, 3 polygon, per the vector tile spec. */
  type: number;
  rings: Array<Array<{ x: number; y: number }>>;
}

/**
 * Where a tile of the fitted grid reads its geometry from, and how that
 * geometry lands in card pixels. `sub` is 1 unless the tile is overzoomed, in
 * which case the source tile covers `sub` tiles per axis and only one of its
 * sub-squares belongs here.
 */
export interface TilePlacement {
  z: number;
  x: number;
  y: number;
  /** Identifies the source tile, so one fetch serves every tile sharing it. */
  key: string;
  offsetX: number;
  offsetY: number;
  sub: number;
}

export function placeTile(tile: MapTile): TilePlacement {
  const dz = Math.max(0, tile.z - SOURCE_MAX_ZOOM);
  const sub = 2 ** dz;
  const x = tile.x >> dz;
  const y = tile.y >> dz;
  return {
    z: tile.z - dz,
    x,
    y,
    key: `${tile.z - dz}/${x}/${y}`,
    // The sub-square this tile occupies is shifted out of the source tile's
    // own origin before the geometry is scaled up to fill the tile's box.
    offsetX: tile.left - (tile.x - x * sub) * TILE_SIZE,
    offsetY: tile.top - (tile.y - y * sub) * TILE_SIZE,
    sub,
  };
}

/** Maps a geometry coordinate onto the card, given the layer's own extent. */
export function project(
  placement: TilePlacement,
  extent: number,
): (x: number, y: number) => [number, number] {
  const scale = (TILE_SIZE * placement.sub) / extent;
  return (x, y) => [
    placement.offsetX + x * scale,
    placement.offsetY + y * scale,
  ];
}

export async function fetchTile(
  placement: TilePlacement,
  key?: string,
): Promise<DecodedTile | null> {
  const url = new URL(
    `${TILE_URL}/${placement.z}/${placement.x}/${placement.y}.mvt`,
  );
  if (key) url.searchParams.set("key", key);

  // A missing tile is ordinary: the grid can reach past the edge of coverage,
  // and open water has nothing to publish. A tile that errors outright is
  // treated the same way, since one unreachable tile should cost its own
  // square rather than the whole card.
  let response: Response;
  try {
    response = await fetch(url, {
      cf: { cacheEverything: true, cacheTtl: TILE_CACHE_SECONDS },
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  // The tiles are served gzipped, which workerd's fetch decodes on the way in.
  return decodeTile(await response.arrayBuffer());
}

export function decodeTile(buffer: ArrayBuffer): DecodedTile {
  const tile = new VectorTile(new PbfReader(new Uint8Array(buffer)));

  // Several paint rules read one layer, and overzoomed tiles share a source,
  // so a layer is asked for many times per render. Geometry is decoded on
  // first ask and held, including the miss.
  const decoded = new Map<string, DecodedLayer | undefined>();

  return {
    layer(name) {
      if (decoded.has(name)) return decoded.get(name);

      const layer = tile.layers[name];
      const result =
        layer === undefined
          ? undefined
          : { extent: layer.extent, features: readFeatures(layer) };
      decoded.set(name, result);
      return result;
    },
  };
}

function readFeatures(layer: VectorTileLayer): DecodedFeature[] {
  const features: DecodedFeature[] = [];
  for (let index = 0; index < layer.length; index++) {
    const feature = layer.feature(index);
    const featureClass = feature.properties["class"];
    features.push({
      ...(typeof featureClass === "string" ? { class: featureClass } : {}),
      type: feature.type,
      rings: feature.loadGeometry(),
    });
  }
  return features;
}
