import { describe, expect, it } from "vitest";
import { ridesHref } from "./links";
import {
  ALL_TIME,
  parsePeriod,
  periodLabel,
  rankPeriods,
  type RecordRow,
} from "./records";

function row(id: string, day: string, overrides: Partial<RecordRow> = {}) {
  return {
    id,
    name: `Ride ${id}`,
    day,
    distanceM: 40_000,
    climbM: 600,
    ...overrides,
  } satisfies RecordRow;
}

describe("parsePeriod", () => {
  it("reads a year and nothing else", () => {
    expect(parsePeriod("2025")).toBe("2025");
    expect(parsePeriod("all")).toBe(ALL_TIME);
    expect(parsePeriod("25")).toBe(ALL_TIME);
    expect(parsePeriod("2025-01")).toBe(ALL_TIME);
    expect(parsePeriod(null)).toBe(ALL_TIME);
  });

  it("labels all time in words and a year as itself", () => {
    expect(periodLabel(ALL_TIME)).toBe("All time");
    expect(periodLabel("2025")).toBe("2025");
  });
});

describe("rankPeriods", () => {
  it("breaks a tie toward the newer ride", () => {
    const [all] = rankPeriods(
      [row("older", "2024-05-01"), row("newer", "2025-05-01")],
      [
        {
          id: "older",
          name: "Ride older",
          day: "2024-05-01",
          durationS: 60,
          watts: 400,
        },
        {
          id: "newer",
          name: "Ride newer",
          day: "2025-05-01",
          durationS: 60,
          watts: 400,
        },
      ],
    );

    expect(all?.longest.map(([id]) => id)).toEqual(["newer", "older"]);
    expect(all?.power.map(([, , id]) => id)).toEqual(["newer"]);
  });

  it("leaves a ride with no climb off the climbing list", () => {
    const [all] = rankPeriods(
      [row("flat", "2025-05-01", { climbM: null }), row("hill", "2025-06-01")],
      [],
    );

    expect(all?.climbing.map(([id]) => id)).toEqual(["hill"]);
    expect(all?.longest.map(([id]) => id)).toEqual(["hill", "flat"]);
  });
});

describe("ridesHref", () => {
  const base = { q: "", units: "imperial" as const };

  it("carries a year on the records view only", () => {
    expect(ridesHref({ ...base, view: "records", period: "2025" })).toBe(
      "/rides?view=records&period=2025",
    );
    expect(ridesHref({ ...base, view: "records", period: ALL_TIME })).toBe(
      "/rides?view=records",
    );
    expect(ridesHref({ ...base, view: "log", period: "2025" })).toBe("/rides");
  });
});
