// Route cards address their basemap as an image the worker renders from CARTO
// vector tiles. Nothing here builds a tile URL for the browser.

/**
 * The sizes the worker will render. The endpoint is public and each render
 * costs a handful of tile fetches, so it serves these and refuses everything
 * else. The cards take their defaults from here, which keeps the two in step.
 */
export const RIDE_MAP = { width: 150, height: 140 } as const;
export const HIGHLIGHT_MAP = { width: 260, height: 130 } as const;

const MAP_SIZES = [RIDE_MAP, HIGHLIGHT_MAP];

export function isMapSize(width: number, height: number): boolean {
  return MAP_SIZES.some(
    (size) => size.width === width && size.height === height,
  );
}

/**
 * Bump when the rendered basemap should change: a new palette, different
 * layers, another zoom ceiling. Rendered images are immutable under a URL this
 * feeds, so a bump is the only thing that retires the ones already sitting in
 * Cloudflare's cache.
 */
export const BASEMAP_VERSION = 1;

/**
 * Identifies the track a card is drawing, so the rendered image can be cached
 * forever under a URL that changes whenever the route does. FNV-1a because it
 * runs in the browser on every card and only has to separate one ride's track
 * from the same ride's re-synced track.
 */
export function routeHash(route: string): string {
  let hash = 0x811c9dc5;
  for (const char of `${BASEMAP_VERSION}:${route}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function mapImageUrl(
  id: string,
  route: string,
  width: number,
  height: number,
  theme: "light" | "dark",
): string {
  const suffix = theme === "dark" ? "-dark" : "";
  return `/map/${encodeURIComponent(id)}/${routeHash(route)}/${width}x${height}${suffix}.png`;
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
