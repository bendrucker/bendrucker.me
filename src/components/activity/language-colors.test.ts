import { describe, it, expect, test } from "vitest";
import { parse, rgb, wcagContrast, type Rgb } from "culori";
import {
  desaturateColor,
  pickLabelColor,
  CONTRAST_FLOOR,
} from "./language-colors";

function mustParseRgb(color: string): Rgb {
  const parsed = parse(color);
  if (!parsed) throw new Error(`unparseable color in test fixture: ${color}`);
  return rgb(parsed);
}

function contrastAgainst(css: string, background: string): number {
  const match = css.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
  if (!match) throw new Error(`unexpected label color format: ${css}`);
  const [, r, g, b, alpha] = match;
  const bg = mustParseRgb(background);
  const fg: Rgb = { mode: "rgb", r: +r / 255, g: +g / 255, b: +b / 255 };
  const composited: Rgb = {
    mode: "rgb",
    r: +alpha * fg.r + (1 - +alpha) * bg.r,
    g: +alpha * fg.g + (1 - +alpha) * bg.g,
    b: +alpha * fg.b + (1 - +alpha) * bg.b,
  };
  return wcagContrast(composited, bg);
}

describe("pickLabelColor", () => {
  // Naive NTSC luma on raw sRGB bytes (the old formula) picks white for all
  // three of these. Composited-contrast (WCAG) picks black instead, which is
  // the bug this module fixes.
  test.each<{ name: string; hex: string; base: "black" | "white" }>([
    { name: "Go", hex: "#00ADD8", base: "black" },
    { name: "Vue", hex: "#41b883", base: "black" },
    { name: "Java", hex: "#b07219", base: "black" },
    { name: "a light background", hex: "#f1e05a", base: "black" },
    { name: "a dark background", hex: "#701516", base: "white" },
  ])("picks $base on $name and clears the contrast floor", ({ hex, base }) => {
    const css = pickLabelColor(hex);
    expect(
      css.startsWith(base === "black" ? "rgba(0,0,0," : "rgba(255,255,255,"),
    ).toBe(true);
    expect(contrastAgainst(css, hex)).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
  });

  it("falls back to a valid, legible label color for an unparseable color", () => {
    const fallbackGray = "#808080";
    const css = pickLabelColor("");
    expect(css).toBe(pickLabelColor(fallbackGray));
    expect(contrastAgainst(css, fallbackGray)).toBeGreaterThanOrEqual(
      CONTRAST_FLOOR,
    );
  });
});

describe("desaturateColor", () => {
  it("moves a saturated color toward gray", () => {
    expect(desaturateColor("#00ADD8", 0.6)).toBe("#4c91a2");
  });

  it("leaves a color unchanged at amount 0", () => {
    expect(desaturateColor("#41b883", 0)).toBe("#41b883");
  });

  it("fully grays out at amount 1", () => {
    const { r, g, b } = mustParseRgb(desaturateColor("#dea584", 1));
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it("does not throw on an unparseable color", () => {
    expect(() => desaturateColor("", 0.6)).not.toThrow();
  });
});
