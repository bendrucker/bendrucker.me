import { describe, expect, it } from "vitest";
import { desktopOnly, splitHighlights } from "./highlights";

const rows = ["a", "b", "c", "d", "e", "f", "g"].map((key) => ({ key }));
const byKey = (keys: string) =>
  keys.split("").map((key) => rows.find((row) => row.key === key) ?? { key });

describe("desktopOnly", () => {
  it("shows three on a phone and five on a desktop", () => {
    expect([0, 1, 2, 3, 4].map((i) => desktopOnly(i))).toEqual([
      false,
      false,
      false,
      true,
      true,
    ]);
  });
});

describe("splitHighlights", () => {
  it("hides the fourth and fifth highlights on a phone", () => {
    const { highlights } = splitHighlights(rows, byKey("gfedc"));
    expect(highlights.map((row) => [row.key, row.desktopOnly])).toEqual([
      ["g", false],
      ["f", false],
      ["e", false],
      ["d", true],
      ["c", true],
    ]);
  });

  it("lists the highlights a phone hides for a phone only", () => {
    const { rest } = splitHighlights(rows, byKey("gfedc"));
    expect(rest.map((row) => [row.key, row.phoneOnly])).toEqual([
      ["a", false],
      ["b", false],
      ["c", true],
      ["d", true],
    ]);
  });

  it("keeps no more than a desktop's highlights", () => {
    const { highlights, rest } = splitHighlights(rows, byKey("abcdefg"));
    expect(highlights.map((row) => row.key)).toEqual(["a", "b", "c", "d", "e"]);
    expect(rest.map((row) => [row.key, row.phoneOnly])).toEqual([
      ["d", true],
      ["e", true],
      ["f", false],
      ["g", false],
    ]);
  });

  it("lists every row when nothing is highlighted", () => {
    const { highlights, rest } = splitHighlights(rows, []);
    expect(highlights).toEqual([]);
    expect(rest.every((row) => !row.phoneOnly)).toBe(true);
    expect(rest).toHaveLength(rows.length);
  });

  it("matches a highlight to its row by identity", () => {
    const { rest } = splitHighlights(rows, [{ key: "a" }]);
    expect(rest.map((row) => row.key)).toContain("a");
  });

  it("leads a phone with as many as a shelf fits", () => {
    const { highlights, rest } = splitHighlights(rows, rows.slice(0, 5), 4);
    expect(highlights.map((row) => row.desktopOnly)).toEqual([
      false,
      false,
      false,
      false,
      true,
    ]);
    expect(rest.filter((row) => row.phoneOnly).map((row) => row.key)).toEqual([
      "e",
    ]);
  });
});
