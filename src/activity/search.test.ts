import { describe, expect, it } from "vitest";
import { markParts, matches } from "./search";

describe("matches", () => {
  const repo = {
    title: "tflint",
    text: "A Pluggable Terraform Linter",
    org: "terraform-linters",
    note: "",
  };

  it("keeps every row for an empty or blank query", () => {
    expect(matches(repo, "")).toBe(true);
    expect(matches(repo, "   ")).toBe(true);
  });

  it("matches the title, ignoring case", () => {
    expect(matches(repo, "TFL")).toBe(true);
  });

  it("matches the description, the org, and the note", () => {
    expect(matches(repo, "pluggable")).toBe(true);
    expect(matches(repo, "linters")).toBe(true);
    expect(matches({ title: "Piranesi", note: "Read it twice" }, "twice")).toBe(
      true,
    );
  });

  it("drops a row no field matches", () => {
    expect(matches(repo, "gardening")).toBe(false);
  });

  it("treats the query as text rather than a pattern", () => {
    expect(matches({ title: "C++ tools" }, "c++")).toBe(true);
    expect(matches({ title: "Ctools" }, "c.")).toBe(false);
  });

  it("matches a query with a hyphen", () => {
    expect(matches({ title: "Local-first software" }, "local-first")).toBe(
      true,
    );
    expect(matches({ title: "Local-first software" }, "-")).toBe(true);
    expect(matches({ title: "Piranesi" }, "-")).toBe(false);
    expect(markParts("Local-first software", "-")).toEqual([
      { text: "Local", hit: false },
      { text: "-", hit: true },
      { text: "first software", hit: false },
    ]);
  });

  it("matches every character a pattern would treat specially", () => {
    const title = "a.*+?^$ {}()|[]/-z";
    expect(matches({ title }, title)).toBe(true);
    expect(matches({ title: String.raw`C:\tools` }, String.raw`:\t`)).toBe(
      true,
    );
  });

  it("trims the query", () => {
    expect(matches(repo, "  tflint ")).toBe(true);
  });
});

describe("markParts", () => {
  it("returns the whole field unmarked without a query", () => {
    expect(markParts("Friends of Tam", "")).toEqual([
      { text: "Friends of Tam", hit: false },
    ]);
  });

  it("marks a match and keeps the field's own case", () => {
    expect(markParts("Friends of Tam", "tam")).toEqual([
      { text: "Friends of ", hit: false },
      { text: "Tam", hit: true },
    ]);
  });

  it("marks every occurrence, not only the first", () => {
    expect(markParts("Tam to Tam via tamalpais", "tam")).toEqual([
      { text: "Tam", hit: true },
      { text: " to ", hit: false },
      { text: "Tam", hit: true },
      { text: " via ", hit: false },
      { text: "tam", hit: true },
      { text: "alpais", hit: false },
    ]);
  });

  it("leaves a field without the query unmarked", () => {
    expect(markParts("MV FF BF SB RRG", "tam")).toEqual([
      { text: "MV FF BF SB RRG", hit: false },
    ]);
  });

  it("rebuilds the field exactly", () => {
    const text = "Stinson EP Alpine, Alpine Dam";
    expect(
      markParts(text, "alpine")
        .map((p) => p.text)
        .join(""),
    ).toBe(text);
  });

  it("returns nothing for an empty field", () => {
    expect(markParts("", "tam")).toEqual([]);
  });
});
