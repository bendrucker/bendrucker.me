import { describe, it, expect } from "vitest";
import { languagesInput, reposInput, yearsInput } from "./filters";

describe("reposInput", () => {
  it("defaults an omitted sort to recent", () => {
    expect(reposInput.parse({}).sort).toBe("recent");
  });

  it("rejects a sort it has no query for", () => {
    expect(reposInput.safeParse({ sort: "popular" }).success).toBe(false);
  });

  it("drops the owner control's unfiltered value", () => {
    expect(reposInput.parse({ owner: "all" }).owner).toBeUndefined();
  });

  it("keeps a named owner", () => {
    expect(reposInput.parse({ owner: "external" }).owner).toBe("external");
  });

  it("rejects an owner outside the vocabulary", () => {
    expect(reposInput.safeParse({ owner: "everyone" }).success).toBe(false);
  });

  it("normalizes a cleared search to absent", () => {
    expect(reposInput.parse({ search: "" }).search).toBeUndefined();
    expect(reposInput.parse({ search: "   " }).search).toBeUndefined();
    expect(reposInput.parse({ search: null }).search).toBeUndefined();
  });

  it("trims a search it keeps", () => {
    expect(reposInput.parse({ search: "  cool " }).search).toBe("cool");
  });

  it("normalizes a cleared language to absent", () => {
    expect(reposInput.parse({ language: null }).language).toBeUndefined();
  });

  it("rejects a year before the database's range", () => {
    expect(reposInput.safeParse({ year: 1999 }).success).toBe(false);
  });

  it("rejects a year beyond next year", () => {
    const beyond = new Date().getFullYear() + 2;
    expect(reposInput.safeParse({ year: beyond }).success).toBe(false);
  });

  it("accepts next year, which a timezone ahead of the server is already in", () => {
    const next = new Date().getFullYear() + 1;
    expect(reposInput.parse({ year: next }).year).toBe(next);
  });

  it("rejects a fractional year", () => {
    expect(reposInput.safeParse({ year: 2025.5 }).success).toBe(false);
  });

  it("takes the filter controls' state as it stands", () => {
    expect(
      reposInput.parse({
        owner: "all",
        language: null,
        search: "",
        sort: "stars",
        year: null,
      }),
    ).toEqual({ sort: "stars" });
  });
});

describe("languagesInput", () => {
  it("takes no language, since the language bar counts across them", () => {
    expect(languagesInput.parse({ language: "Go" })).not.toHaveProperty(
      "language",
    );
  });
});

describe("yearsInput", () => {
  it("takes no year, since the year list spans them", () => {
    expect(yearsInput.parse({ year: 2025 })).not.toHaveProperty("year");
  });
});
