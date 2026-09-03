import {
  blend,
  formatHex,
  modeLrgb,
  modeRgb,
  parse,
  useMode,
  wcagContrast,
  type Rgb,
} from "culori/fn";

// culori's main entry registers all 29 color spaces as a top-level side effect,
// so no bundler can shake the unused ones out. `culori/fn` registers nothing,
// leaving the two modes this module needs to be named here: 4.4KB gzipped in
// the activity page's client bundle against 15.3KB for the main entry.
const rgb = useMode(modeRgb);
useMode(modeLrgb); // wcagContrast reads relative luminance through lrgb

// The query layer coalesces a missing language color to "" (see
// src/activity/query.ts), and GitHub's own language colors are outside our
// control, so a color culori can't parse falls back to a neutral gray rather
// than propagating as "#NaNNaNNaN".
const FALLBACK_COLOR: Rgb = { mode: "rgb", r: 0.5, g: 0.5, b: 0.5 };

function toRgb(hex: string): Rgb {
  const parsed = parse(hex);
  return parsed ? rgb(parsed) : FALLBACK_COLOR;
}

const BLACK: Rgb = { mode: "rgb", r: 0, g: 0, b: 0 };
const WHITE: Rgb = { mode: "rgb", r: 1, g: 1, b: 1 };

// Where each label starts before it has to earn its legibility. White carries
// less weight than black at the same opacity, hence the higher floor.
const BLACK_START_ALPHA = 0.6;
const WHITE_START_ALPHA = 0.8;

/** WCAG AA for normal-size text, which a 9px label is. */
export const CONTRAST_FLOOR = 4.5;

function contrastAt(fg: Rgb, alpha: number, bg: Rgb): number {
  return wcagContrast(blend([bg, { ...fg, alpha }], "normal", "rgb"), bg);
}

/**
 * Raises opacity a percent at a time until the label clears `CONTRAST_FLOOR`
 * against its own segment, so the softest legible label wins. Contrast climbs
 * monotonically with alpha for whichever of black or white already measured
 * better, so the first passing step is the lowest one. A background no opacity
 * can rescue ends up fully opaque, which is the best available.
 */
function alphaMeetingFloor(fg: Rgb, startAlpha: number, bg: Rgb): number {
  for (let pct = Math.round(startAlpha * 100); pct < 100; pct++) {
    const alpha = pct / 100;
    if (contrastAt(fg, alpha, bg) >= CONTRAST_FLOOR) return alpha;
  }
  return 1;
}

function channel(value: number): number {
  return Math.round(value * 255);
}

function toRgba(fg: Rgb, alpha: number): string {
  return `rgba(${channel(fg.r)},${channel(fg.g)},${channel(fg.b)},${alpha})`;
}

/**
 * The label paints over a segment's own background at partial opacity, so
 * the pair that matters is the composited label against that background —
 * not either candidate's own luminance against a fixed threshold, which is
 * what let mid-tones like Go's `#00ADD8` pick the losing option.
 */
export function pickLabelColor(background: string): string {
  const bg = toRgb(background);
  const preferBlack =
    contrastAt(BLACK, BLACK_START_ALPHA, bg) >=
    contrastAt(WHITE, WHITE_START_ALPHA, bg);
  const fg = preferBlack ? BLACK : WHITE;
  const startAlpha = preferBlack ? BLACK_START_ALPHA : WHITE_START_ALPHA;
  return toRgba(fg, alphaMeetingFloor(fg, startAlpha, bg));
}

/**
 * Mixes each channel toward the color's own gray by `amount`, using sRGB-luma
 * weighting, for the striped overflow gradient. An oklch-chroma desaturation
 * lightens some swatches visibly (Go's `#00ADD8` goes from `#4c91a2` to
 * `#7aa4b5` at amount 0.6), so this keeps the luma weights instead.
 */
export function desaturateColor(hex: string, amount: number): string {
  const c = toRgb(hex);
  const gray = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  const mix = (value: number) => value + (gray - value) * amount;
  return formatHex({ mode: "rgb", r: mix(c.r), g: mix(c.g), b: mix(c.b) });
}
