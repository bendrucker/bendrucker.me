import { formatHex, parse, rgb, wcagContrast, type Rgb } from "culori";

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
const BLACK_ALPHA = 0.6;
const WHITE_ALPHA = 0.8;

export const LABEL_BLACK = `rgba(0,0,0,${BLACK_ALPHA})`;
export const LABEL_WHITE = `rgba(255,255,255,${WHITE_ALPHA})`;

function blendOver(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return {
    mode: "rgb",
    r: alpha * fg.r + (1 - alpha) * bg.r,
    g: alpha * fg.g + (1 - alpha) * bg.g,
    b: alpha * fg.b + (1 - alpha) * bg.b,
  };
}

/**
 * The label paints over a segment's own background at partial opacity, so
 * the pair that matters is the composited label against that background —
 * not either candidate's own luminance against a fixed threshold, which is
 * what let mid-tones like Go's `#00ADD8` pick the losing option.
 */
export function pickLabelColor(background: string): string {
  const bg = toRgb(background);
  const blackContrast = wcagContrast(blendOver(BLACK, BLACK_ALPHA, bg), bg);
  const whiteContrast = wcagContrast(blendOver(WHITE, WHITE_ALPHA, bg), bg);
  return blackContrast >= whiteContrast ? LABEL_BLACK : LABEL_WHITE;
}

/**
 * Mixes each channel toward the color's own gray by `amount`, the same
 * sRGB-luma weighting the old hand-rolled version used, for the striped
 * overflow gradient. An oklch-chroma desaturation was tried here too, but it
 * visibly lightens some swatches (Go's `#00ADD8` shifts from `#4c91a2` to
 * `#7aa4b5` at amount 0.6), so this keeps the existing weights instead.
 */
export function desaturateColor(hex: string, amount: number): string {
  const c = toRgb(hex);
  const gray = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
  const mix = (channel: number) => channel + (gray - channel) * amount;
  return formatHex({ mode: "rgb", r: mix(c.r), g: mix(c.g), b: mix(c.b) });
}
