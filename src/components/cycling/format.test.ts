import { describe, expect, it } from "vitest";
import {
  distanceUnit,
  elevationUnit,
  formatClock,
  formatDistance,
  formatDuration,
  formatElevation,
  formatMonthKey,
  formatSpeed,
  monthAfter,
  monthKeyOf,
  monthsBefore,
  speedUnit,
} from "./format";

describe("unit labels", () => {
  it("names imperial units", () => {
    expect(distanceUnit("imperial")).toBe("mi");
    expect(elevationUnit("imperial")).toBe("ft");
    expect(speedUnit("imperial")).toBe("mph");
  });

  it("names metric units", () => {
    expect(distanceUnit("metric")).toBe("km");
    expect(elevationUnit("metric")).toBe("m");
    expect(speedUnit("metric")).toBe("km/h");
  });
});

describe("formatDistance", () => {
  it("keeps one decimal", () => {
    expect(formatDistance(138.71, "imperial")).toBe("138.7");
  });

  it("groups thousands, so annual totals stay readable", () => {
    expect(formatDistance(14382.6, "imperial")).toBe("14,382.6");
  });

  it("converts to kilometers", () => {
    expect(formatDistance(100, "metric")).toBe("160.9");
  });

  it("holds the decimal at zero", () => {
    expect(formatDistance(0, "imperial")).toBe("0.0");
  });
});

describe("formatElevation", () => {
  it("rounds and groups feet", () => {
    expect(formatElevation(18100.4, "imperial")).toBe("18,100");
  });

  it("converts to meters", () => {
    expect(formatElevation(1000, "metric")).toBe("305");
  });
});

describe("formatSpeed", () => {
  it("keeps one decimal", () => {
    expect(formatSpeed(17.42, "imperial")).toBe("17.4");
  });

  it("converts to km/h", () => {
    expect(formatSpeed(10, "metric")).toBe("16.1");
  });
});

describe("formatDuration", () => {
  it("reads as minutes below an hour", () => {
    expect(formatDuration(48 * 60)).toBe("48 min");
  });

  it("switches to hours and pads the minutes", () => {
    expect(formatDuration(4 * 3600 + 32 * 60)).toBe("4:32");
    expect(formatDuration(4 * 3600 + 5 * 60)).toBe("4:05");
  });

  it("rounds to the nearest minute", () => {
    expect(formatDuration(3600 + 89)).toBe("1:01");
  });

  it("shows zero minutes rather than an empty string", () => {
    expect(formatDuration(0)).toBe("0 min");
  });
});

describe("formatClock", () => {
  it("drops the hour field below an hour", () => {
    expect(formatClock(18 * 60 + 42)).toBe("18:42");
  });

  it("pads minutes and seconds past an hour", () => {
    expect(formatClock(3600 + 4 * 60 + 32)).toBe("1:04:32");
    expect(formatClock(3600 + 5)).toBe("1:00:05");
  });
});

describe("month keys", () => {
  it("spells the month out", () => {
    expect(formatMonthKey("2026-08")).toBe("august 2026");
    expect(formatMonthKey("2026-01")).toBe("january 2026");
    expect(formatMonthKey("2026-12")).toBe("december 2026");
  });

  it("derives a key from a start time", () => {
    expect(monthKeyOf("2026-07-11T07:42:00")).toBe("2026-07");
  });
});

describe("monthAfter", () => {
  it("steps to the next month", () => {
    expect(monthAfter("2026-07")).toBe("2026-08");
  });

  it("rolls the year over past december", () => {
    expect(monthAfter("2026-12")).toBe("2027-01");
  });
});

describe("monthsBefore", () => {
  it("steps back within a year", () => {
    expect(monthsBefore("2026-07", 6)).toBe("2026-01");
  });

  it("rolls the year back past january", () => {
    expect(monthsBefore("2026-01", 1)).toBe("2025-12");
    expect(monthsBefore("2026-05", 12)).toBe("2025-05");
    expect(monthsBefore("2026-02", 25)).toBe("2024-01");
  });

  it("returns the month itself for no steps", () => {
    expect(monthsBefore("2026-07", 0)).toBe("2026-07");
  });
});
