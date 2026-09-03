import { describe, it, expect, test } from "vitest";
import {
  desaturateColor,
  pickLabelColor,
  LABEL_BLACK,
  LABEL_WHITE,
} from "./language-colors";

describe("pickLabelColor", () => {
  // Naive NTSC luma on raw sRGB bytes (the old formula) picks white for all
  // three of these. Composited-contrast (WCAG) picks black instead, which is
  // the bug this module fixes.
  test.each<{ name: string; hex: string }>([
    { name: "Go", hex: "#00ADD8" },
    { name: "Vue", hex: "#41b883" },
    { name: "Java", hex: "#b07219" },
  ])(
    "picks black-on-$name where naive luma would have picked white",
    ({ hex }) => {
      expect(pickLabelColor(hex)).toBe(LABEL_BLACK);
    },
  );

  it("picks black on a light background", () => {
    expect(pickLabelColor("#f1e05a")).toBe(LABEL_BLACK);
  });

  it("picks white on a dark background", () => {
    expect(pickLabelColor("#701516")).toBe(LABEL_WHITE);
  });

  it("falls back to a valid label color for an unparseable color", () => {
    expect([LABEL_BLACK, LABEL_WHITE]).toContain(pickLabelColor(""));
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
    const result = desaturateColor("#dea584", 1);
    const [r, g, b] = [
      result.slice(1, 3),
      result.slice(3, 5),
      result.slice(5, 7),
    ];
    expect(r).toBe(g);
    expect(g).toBe(b);
  });

  it("does not throw on an unparseable color", () => {
    expect(() => desaturateColor("", 0.6)).not.toThrow();
  });
});
