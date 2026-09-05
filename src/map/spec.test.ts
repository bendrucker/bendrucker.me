import { describe, expect, it } from "vitest";
import { parseSpec } from "./spec";

describe("parseSpec", () => {
  it.each<{ spec: string; scale: 1 | 2; theme: "light" | "dark" }>([
    { spec: "150x140", scale: 1, theme: "light" },
    { spec: "150x140@2x", scale: 2, theme: "light" },
    { spec: "150x140-dark", scale: 1, theme: "dark" },
    { spec: "150x140@2x-dark", scale: 2, theme: "dark" },
  ])("parses $spec", ({ spec, scale, theme }) => {
    expect(parseSpec(spec)).toEqual({ width: 150, height: 140, scale, theme });
  });

  it("refuses a scale outside {1, 2}", () => {
    expect(parseSpec("150x140@3x")).toBeNull();
    expect(parseSpec("150x140@1x")).toBeNull();
  });

  it("refuses the scale in the wrong position", () => {
    expect(parseSpec("150x140-dark@2x")).toBeNull();
  });

  it("refuses a spec with no dimensions", () => {
    expect(parseSpec("@2x-dark")).toBeNull();
  });
});
