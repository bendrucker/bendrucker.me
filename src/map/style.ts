// How a vector tile's layers become paint. CARTO ships a MapLibre style JSON
// for its basemaps, but that style is written for a full interactive map:
// hundreds of rules, zoom interpolations, and label layers that would need
// glyphs loaded into the rasterizer. A route card is 150px of context behind a
// line, so it draws a dozen rules of its own instead.

export type Theme = "light" | "dark";

/**
 * Colors chosen against the site's own `--muted`, which is what a card shows
 * where the map does not reach. Land sits a shade off it so the map reads as a
 * map rather than as a gap, and every hue stays in the theme's family so the
 * accent-colored route line keeps the most contrast on the card.
 */
interface Palette {
  land: string;
  wood: string;
  grass: string;
  water: string;
  road: string;
  majorRoad: string;
}

const PALETTES: Record<Theme, Palette> = {
  light: {
    land: "#ededed",
    wood: "#e2e8e0",
    grass: "#e7ebe4",
    water: "#d3e0e8",
    road: "#f7f7f7",
    majorRoad: "#ffffff",
  },
  dark: {
    land: "#2b3350",
    wood: "#28324b",
    grass: "#2c3852",
    water: "#1c2540",
    road: "#3c4870",
    majorRoad: "#4a5788",
  },
};

/** Renders in source order, beneath the lines. */
export interface FillRule {
  kind: "fill";
  layer: string;
  fill: string;
  /** Restricts the rule to these OpenMapTiles `class` values. */
  classes?: string[];
}

/** Widths are CSS pixels at the card's own size. */
export interface LineRule {
  kind: "line";
  layer: string;
  stroke: string;
  width: number;
  classes?: string[];
}

export type PaintRule = FillRule | LineRule;

export function background(theme: Theme): string {
  return PALETTES[theme].land;
}

/**
 * Painter's order: ground cover, then water, then roads from smallest to
 * largest, so a motorway is not broken by every track that crosses it.
 */
export function paintRules(theme: Theme): PaintRule[] {
  const palette = PALETTES[theme];
  return [
    {
      kind: "fill",
      layer: "landcover",
      fill: palette.wood,
      classes: ["wood", "forest"],
    },
    {
      kind: "fill",
      layer: "landcover",
      fill: palette.grass,
      classes: ["grass", "scrub", "farmland", "meadow"],
    },
    {
      kind: "fill",
      layer: "landuse",
      fill: palette.grass,
      classes: ["park", "cemetery", "pitch", "golf_course"],
    },
    { kind: "fill", layer: "water", fill: palette.water },
    { kind: "line", layer: "waterway", stroke: palette.water, width: 0.8 },
    {
      kind: "line",
      layer: "transportation",
      stroke: palette.road,
      width: 0.5,
      classes: ["path", "track", "service"],
    },
    {
      kind: "line",
      layer: "transportation",
      stroke: palette.road,
      width: 0.9,
      classes: ["minor"],
    },
    {
      kind: "line",
      layer: "transportation",
      stroke: palette.majorRoad,
      width: 1.3,
      classes: ["tertiary", "secondary"],
    },
    {
      kind: "line",
      layer: "transportation",
      stroke: palette.majorRoad,
      width: 1.8,
      classes: ["motorway", "trunk", "primary"],
    },
  ];
}
