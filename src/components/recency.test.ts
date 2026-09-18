import { describe, expect, test } from "vitest";
import { groupByRecency, recencyLabel } from "./recency";

const now = new Date(2026, 8, 8, 12);
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe("recencyLabel", () => {
  test.each<{ name: string; date: Date; expected: string }>([
    { name: "earlier today", date: new Date(2026, 8, 8, 6), expected: "today" },
    {
      name: "late last night",
      date: new Date(2026, 8, 7, 23, 30),
      expected: "yesterday",
    },
    { name: "three days back", date: daysAgo(3), expected: "this week" },
    { name: "six days back", date: daysAgo(6), expected: "this week" },
    { name: "a week back", date: daysAgo(7), expected: "earlier" },
    { name: "a month back", date: daysAgo(30), expected: "earlier" },
  ])("$name", ({ date, expected }) => {
    expect(recencyLabel(date, now)).toBe(expected);
  });
});

describe("groupByRecency", () => {
  test("shelves items in order and skips empty shelves", () => {
    const items = [daysAgo(0), daysAgo(0), daysAgo(3), daysAgo(20)];
    const groups = groupByRecency(items, (item) => item, now);
    expect(groups.map((group) => [group.label, group.items.length])).toEqual([
      ["today", 2],
      ["this week", 1],
      ["earlier", 1],
    ]);
  });

  test("shelves nothing from nothing", () => {
    expect(groupByRecency([], (item: Date) => item, now)).toEqual([]);
  });
});
