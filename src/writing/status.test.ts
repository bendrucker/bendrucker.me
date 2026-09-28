import { describe, expect, it } from "vitest";
import { searchStatus } from "./status";

describe("searchStatus", () => {
  it("counts the posts a query leaves", () => {
    expect(searchStatus("open", 3)).toBe("3 posts");
    expect(searchStatus("open", 1)).toBe("1 post");
    expect(searchStatus("open", 0)).toBe("0 posts");
  });

  it("says nothing without a query", () => {
    expect(searchStatus("", 22)).toBe("");
    expect(searchStatus("  ", 22)).toBe("");
  });
});
