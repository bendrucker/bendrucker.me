import { describe, expect, it } from "vitest";
import { episodeTicks, TICK_MAX, tickLabel } from "./ticks";

describe("episodeTicks", () => {
  it("draws a tick per episode up to twelve", () => {
    expect(episodeTicks(4, 6)).toEqual([1, 1, 1, 1, 0, 0]);
    expect(episodeTicks(12, 12)).toHaveLength(12);
  });

  it("spreads a longer season over at most twelve ticks", () => {
    expect(episodeTicks(15, 15)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(episodeTicks(0, 100).length).toBeLessThanOrEqual(TICK_MAX);
  });

  it("fills a tick covering several episodes by the share watched", () => {
    // 15 episodes, two to a tick: the fourth tick holds episodes 7 and 8.
    expect(episodeTicks(7, 15).slice(2, 5)).toEqual([1, 0.5, 0]);
    // 13 episodes, two to a tick: the last covers one.
    expect(episodeTicks(13, 13).at(-1)).toBe(1);
    expect(episodeTicks(12, 13).at(-1)).toBe(0);
  });

  it("draws nothing for a season with nothing aired", () => {
    expect(episodeTicks(0, 0)).toEqual([]);
  });
});

describe("tickLabel", () => {
  it("says how many were watched", () => {
    expect(tickLabel(7, 10)).toBe("7 of 10 episodes watched");
  });
});
