import { describe, expect, test } from "vitest";
import { isDefaultName } from "./names";

describe("isDefaultName", () => {
  test.each<[string, boolean]>([
    ["Morning Ride", true],
    ["Lunch Ride", true],
    ["Night Ride", true],
    ["Afternoon Gravel Ride", true],
    ["Coffee ride", false],
    ["Morning Ride to Stinson", false],
    ["Headlands", false],
  ])("%p is %p", (name, expected) => {
    expect(isDefaultName(name)).toBe(expected);
  });
});
