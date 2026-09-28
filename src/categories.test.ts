import { describe, expect, it } from "vitest";
import { isEnabled, type CategoryId } from "@/config";
import {
  CATEGORIES,
  category,
  creditLine,
  enabledCategories,
  homeCredits,
} from "./categories";

const production = (id: CategoryId) => isEnabled(id, { DEV: false });

describe("isEnabled", () => {
  it("leaves the fixture-backed categories off in a production build", () => {
    expect(production("rides")).toBe(true);
    expect(production("code")).toBe(true);
    expect(production("writing")).toBe(true);
    expect(production("reading")).toBe(false);
    expect(production("watching")).toBe(false);
    expect(production("listening")).toBe(false);
  });

  it("turns every category on in development", () => {
    expect(isEnabled("listening", { DEV: true })).toBe(true);
  });

  it("turns every category on under PUBLIC_ALL_CATEGORIES=1", () => {
    expect(
      isEnabled("watching", { DEV: false, PUBLIC_ALL_CATEGORIES: "1" }),
    ).toBe(true);
  });

  it("ignores any other value of PUBLIC_ALL_CATEGORIES", () => {
    expect(
      isEnabled("watching", { DEV: false, PUBLIC_ALL_CATEGORIES: "0" }),
    ).toBe(false);
  });
});

describe("categories", () => {
  it("lists the six in home-card order", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual([
      "rides",
      "code",
      "reading",
      "writing",
      "watching",
      "listening",
    ]);
  });

  it("looks a category up by id", () => {
    expect(category("code").noun).toBe("repositories");
  });

  it("drops the categories a build leaves off", () => {
    expect(enabledCategories(production).map((c) => c.id)).toEqual([
      "rides",
      "code",
      "writing",
    ]);
  });
});

describe("homeCredits", () => {
  it("credits posters and covers when their cards show", () => {
    expect(homeCredits(() => true)).toEqual(["posters", "covers"]);
  });

  it("credits nothing once those categories are off", () => {
    expect(homeCredits(production)).toEqual([]);
  });
});

describe("creditLine", () => {
  it("is empty with nothing to credit", () => {
    expect(creditLine([])).toBe("");
  });

  it("credits maps alone without the artwork line", () => {
    expect(creditLine(["maps"])).toBe(
      "Maps © CARTO, © OpenStreetMap contributors.",
    );
  });

  it("credits art to its owners, in a fixed order", () => {
    expect(creditLine(["covers", "posters"])).toBe(
      "Posters from TVmaze and Wikipedia. Covers from Apple and the Cover Art Archive. Artwork belongs to its owners.",
    );
  });
});
