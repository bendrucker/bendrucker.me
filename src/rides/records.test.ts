import { describe, expect, it } from "vitest";
import { ridesHref } from "./links";
import {
  ALL_TIME,
  parsePeriod,
  periodLabel,
  rankPeriods,
  type ClimbEffort,
  type RecordRow,
} from "./records";

function climb(
  id: string,
  day: string,
  overrides: Partial<ClimbEffort> = {},
): ClimbEffort {
  return {
    id,
    position: 0,
    climb: null,
    ride: `Ride ${id}`,
    day,
    gainM: 500,
    ...overrides,
  };
}

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

  it("places a named climb once, by its biggest effort", () => {
    const [all] = rankPeriods(
      [row("first", "2024-05-01")],
      [],
      [
        climb("first", "2024-05-01", { climb: "Mount Diablo", gainM: 1_000 }),
        climb("tie", "2025-05-01", { climb: "Mount Diablo", gainM: 1_000 }),
        climb("slow", "2025-06-01", { climb: "Mount Diablo", gainM: 900 }),
        climb("a", "2025-07-01", { gainM: 800 }),
        climb("b", "2025-08-01", { gainM: 800 }),
      ],
    );

    expect(all?.climbs).toEqual([
      ["first", 0, "Mount Diablo", "Ride first", "2024-05-01", 1_000],
      ["a", 0, null, "Ride a", "2025-07-01", 800],
      ["b", 0, null, "Ride b", "2025-08-01", 800],
    ]);
  });

  it("ranks a year's climbs from that year's rides only", () => {
    const periods = rankPeriods(
      [row("old", "2024-05-01"), row("new", "2025-05-01")],
      [],
      [
        climb("old", "2024-05-01", { climb: "Mount Diablo", gainM: 1_000 }),
        climb("new", "2025-05-01", { climb: "Mount Diablo", gainM: 700 }),
      ],
    );

    expect(
      periods.map(({ period, climbs }) => [period, climbs.map(([id]) => id)]),
    ).toEqual([
      ["all", ["old"]],
      ["2025", ["new"]],
      ["2024", ["old"]],
    ]);
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
