import { describe, expect, it } from "vitest";
import { parseRideTime } from "./datetime";

function fields(date: Date): number[] {
  return [
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ];
}

describe("parseRideTime", () => {
  it("reads a zone-less timestamp as wall-clock time", () => {
    expect(fields(parseRideTime("2026-07-11T05:00:55"))).toEqual([
      2026, 6, 11, 5, 0, 55,
    ]);
  });

  it("ignores a zone suffix rather than shifting the day", () => {
    expect(fields(parseRideTime("2026-07-11T05:00:55Z"))).toEqual([
      2026, 6, 11, 5, 0, 55,
    ]);
    expect(fields(parseRideTime("2026-07-11T05:00:55-07:00"))).toEqual([
      2026, 6, 11, 5, 0, 55,
    ]);
  });

  it("accepts a date with no time, and a time with no seconds", () => {
    expect(fields(parseRideTime("2026-07-11"))).toEqual([2026, 6, 11, 0, 0, 0]);
    expect(fields(parseRideTime("2026-07-11T05:00"))).toEqual([
      2026, 6, 11, 5, 0, 0,
    ]);
  });

  it("is invalid rather than wrong for unparseable input", () => {
    expect(Number.isNaN(parseRideTime("").getTime())).toBe(true);
    expect(Number.isNaN(parseRideTime("last tuesday").getTime())).toBe(true);
  });
});
