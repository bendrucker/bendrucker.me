/**
 * The basemap route's URL grammar, kept apart from the route file itself: the
 * route imports `cloudflare:workers` at module scope, which does not resolve
 * under Vitest, so parsing has to live somewhere importable to be tested.
 */

export interface ParsedSpec {
  /** CSS pixels, matching what `fitRoute` frames the tiles against. */
  width: number;
  height: number;
  scale: 1 | 2;
  theme: "light" | "dark";
}

// Matched whole. Dimensions are checked against `isMapSize` by the caller.
const SPEC = /^(\d{1,4})x(\d{1,4})(@2x)?(-dark)?$/;

export function parseSpec(spec: string): ParsedSpec | null {
  const match = SPEC.exec(spec);
  if (match === null) return null;
  return {
    width: Number(match[1]),
    height: Number(match[2]),
    scale: match[3] === undefined ? 1 : 2,
    theme: match[4] === undefined ? "light" : "dark",
  };
}
