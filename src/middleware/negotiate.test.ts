import { describe, it, expect } from "vitest";
import { negotiate, PRODUCES } from "./negotiate";

describe("negotiate", () => {
  it("returns first produces entry when Accept is null", () => {
    expect(negotiate(null, PRODUCES)).toBe("text/html");
  });

  it("returns first produces entry when Accept is empty", () => {
    expect(negotiate("", PRODUCES)).toBe("text/html");
  });

  it("picks text/html for */*", () => {
    expect(negotiate("*/*", PRODUCES)).toBe("text/html");
  });

  it("picks text/html for Accept: text/html", () => {
    expect(negotiate("text/html", PRODUCES)).toBe("text/html");
  });

  it("picks text/markdown for Accept: text/markdown", () => {
    expect(negotiate("text/markdown", PRODUCES)).toBe("text/markdown");
  });

  it("tiebreaks equal-q candidates by produces order", () => {
    expect(negotiate("text/markdown, text/html", PRODUCES)).toBe("text/html");
  });

  it("picks higher q when q values differ", () => {
    expect(negotiate("text/markdown;q=0.9, text/html;q=0.5", PRODUCES)).toBe(
      "text/markdown",
    );
  });

  it("rejects candidates matched by q=0", () => {
    expect(negotiate("text/html;q=0, text/markdown", PRODUCES)).toBe(
      "text/markdown",
    );
  });

  it("picks text/html for Accept: text/* via produces-order tiebreak", () => {
    expect(negotiate("text/*", PRODUCES)).toBe("text/html");
  });

  it("returns null when no candidate matches", () => {
    expect(negotiate("application/json", PRODUCES)).toBeNull();
  });

  it("treats malformed q-values as 1", () => {
    expect(negotiate("text/markdown;q=abc", PRODUCES)).toBe("text/markdown");
  });

  it("picks specificity-resolved q per candidate", () => {
    expect(negotiate("text/html;q=0.8, text/*;q=0.9", PRODUCES)).toBe(
      "text/markdown",
    );
  });
});
