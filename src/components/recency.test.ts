import { describe, expect, test } from "vitest";
import { formatRecency } from "./recency";

const now = new Date(2026, 8, 8, 12);

describe("formatRecency", () => {
  test.each<{ name: string; date: Date; expected: string }>([
    { name: "earlier today", date: new Date(2026, 8, 8, 6), expected: "today" },
    {
      name: "late last night",
      date: new Date(2026, 8, 7, 23, 30),
      expected: "yesterday",
    },
    { name: "three days back", date: new Date(2026, 8, 5), expected: "3d ago" },
    { name: "a week back", date: new Date(2026, 8, 1), expected: "1w ago" },
    {
      name: "three weeks back",
      date: new Date(2026, 7, 18),
      expected: "3w ago",
    },
    { name: "a month back", date: new Date(2026, 7, 8), expected: "Aug 8" },
    {
      name: "last year",
      date: new Date(2025, 11, 30),
      expected: "Dec 30, 2025",
    },
  ])("$name", ({ date, expected }) => {
    expect(formatRecency(date, now)).toBe(expected);
  });
});
