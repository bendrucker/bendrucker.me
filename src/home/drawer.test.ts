import { describe, expect, it } from "vitest";
import { FADE, FLICK, fadeDepth, rubberBand, settlesOpen } from "./drawer";

const PEEK = 148;
const FULL = 348;

describe("rubberBand", () => {
  it("follows the pull between the ends", () => {
    expect(rubberBand(250, PEEK, FULL)).toBe(250);
  });

  it("resists past the open end", () => {
    expect(rubberBand(FULL + 100, PEEK, FULL)).toBe(FULL + 30);
  });

  it("resists past the shut end", () => {
    expect(rubberBand(PEEK - 100, PEEK, FULL)).toBe(PEEK - 30);
  });
});

describe("fadeDepth", () => {
  it("is full at the peek and gone once open", () => {
    expect(fadeDepth(PEEK, PEEK, FULL)).toBe(FADE);
    expect(fadeDepth(FULL, PEEK, FULL)).toBe(0);
    expect(fadeDepth((PEEK + FULL) / 2, PEEK, FULL)).toBe(FADE / 2);
  });

  it("stays within its depth past either end", () => {
    expect(fadeDepth(PEEK - 40, PEEK, FULL)).toBe(FADE);
    expect(fadeDepth(FULL + 40, PEEK, FULL)).toBe(0);
  });

  it("is gone when the body fits", () => {
    expect(fadeDepth(PEEK, PEEK, PEEK)).toBe(0);
  });
});

function at(height: number, velocity = 0) {
  return settlesOpen({ velocity, height, peek: PEEK, full: FULL });
}

describe("settlesOpen", () => {
  it("settles on whichever end is nearer", () => {
    expect(at(PEEK + 40)).toBe(false);
    expect(at(FULL - 40)).toBe(true);
  });

  it("lets a flick decide against the midpoint", () => {
    expect(at(PEEK + 10, FLICK + 0.1)).toBe(true);
    expect(at(FULL - 10, -FLICK - 0.1)).toBe(false);
  });
});
