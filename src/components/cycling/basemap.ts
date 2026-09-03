import type { MapTile } from "./geo";

const TILE_URL = "https://basemaps.cartocdn.com/light_all";

/**
 * CARTO's raster basemaps require a key, and serve tiles stamped "API KEY
 * REQUIRED" across the image without one. The key is scoped to the domains it
 * was issued for rather than secret, which is what lets it ship to the browser,
 * the only place tile URLs are built.
 */
function key(): string {
  return import.meta.env.PUBLIC_CARTO_BASEMAP_KEY ?? "";
}

/** Whether tiles can be drawn at all. Without a key the route goes unmapped. */
export function hasBasemap(): boolean {
  return key() !== "";
}

export function tileUrl(tile: MapTile): string {
  const query = new URLSearchParams({ key: key() });
  return `${TILE_URL}/${tile.z}/${tile.x}/${tile.y}@2x.png?${query}`;
}

/**
 * The free tier's price. CARTO's basemap terms require both credits to stay
 * visible wherever the tiles are, and the maps here are too small to carry
 * them, so a view renders this once beneath its cards.
 */
export const BASEMAP_CREDITS = [
  {
    label: "OpenStreetMap contributors",
    href: "https://www.openstreetmap.org/copyright",
  },
  { label: "CARTO", href: "https://carto.com/attributions" },
];
