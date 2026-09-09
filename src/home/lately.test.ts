import { describe, expect, test } from "vitest";
import { latelySentence } from "./lately";
import type { WeekSummary } from "./recent";

function makeWeek(overrides: Partial<WeekSummary> = {}): WeekSummary {
  return {
    rideCount: 0,
    distanceMi: 0,
    raceCount: 0,
    repoCount: 0,
    ...overrides,
  };
}

describe("latelySentence", () => {
  test.each<{ name: string; week: WeekSummary; expected: string }>([
    { name: "nothing at all", week: makeWeek(), expected: "A quiet week." },
    {
      name: "rides and code",
      week: makeWeek({ rideCount: 3, distanceMi: 90.4, repoCount: 4 }),
      expected:
        "This week: three rides and 90 miles, plus code in four repositories.",
    },
    {
      name: "one ride that was a race",
      week: makeWeek({ rideCount: 1, distanceMi: 21.4, raceCount: 1 }),
      expected: "This week: one ride and 21 miles, a race.",
    },
    {
      name: "a race among several rides",
      week: makeWeek({ rideCount: 4, distanceMi: 120, raceCount: 1 }),
      expected: "This week: four rides and 120 miles, one of them a race.",
    },
    {
      name: "only code",
      week: makeWeek({ repoCount: 1 }),
      expected: "This week: code in one repository.",
    },
    {
      name: "a big week in digits",
      week: makeWeek({ rideCount: 12, distanceMi: 1004, repoCount: 11 }),
      expected:
        "This week: 12 rides and 1,004 miles, plus code in 11 repositories.",
    },
    {
      name: "rides with no distance recorded",
      week: makeWeek({ rideCount: 2 }),
      expected: "This week: two rides.",
    },
  ])("$name", ({ week, expected }) => {
    expect(latelySentence(week)).toBe(expected);
  });
});
