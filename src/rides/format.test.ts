import { describe, expect, it } from "vitest";
import {
  climbFigure,
  distanceFigure,
  fullDate,
  gutterSub,
  parseUnits,
} from "./format";

describe("figures", () => {
  it("rounds distance to whole miles or kilometres", () => {
    expect(distanceFigure(224_000, "imperial")).toBe("139 mi");
    expect(distanceFigure(224_000, "metric")).toBe("224 km");
  });

  it("groups climbing in feet or metres", () => {
    expect(climbFigure(5_517, "imperial")).toBe("18,100 ft");
    expect(climbFigure(5_517, "metric")).toBe("5,517 m");
  });
});

describe("parseUnits", () => {
  it("defaults anything but metric to miles", () => {
    expect(parseUnits("metric")).toBe("metric");
    expect(parseUnits("furlongs")).toBe("imperial");
    expect(parseUnits(null)).toBe("imperial");
  });
});

describe("fullDate", () => {
  it("names the weekday and leaves this year unsaid", () => {
    expect(fullDate("2026-07-11", "2026")).toBe("Saturday, July 11");
    expect(fullDate("2019-07-11", "2026")).toBe("Thursday, July 11, 2019");
  });
});

describe("gutterSub", () => {
  it("prints the month this year and the year before it", () => {
    expect(gutterSub("2026-07-11", "2026")).toBe("jul");
    expect(gutterSub("2019-07-11", "2026")).toBe("2019");
  });
});
