import { describe, expect, it } from "vitest";
import { homeFullHref, homeKey, parseHomeKey } from "./detail";

describe("homeKey", () => {
  it("names a ride's page by its id", () => {
    expect(homeKey("/rides/01KX8GTM6RBTZH5J8CEQXEDEBV")).toBe(
      "ride/01KX8GTM6RBTZH5J8CEQXEDEBV",
    );
  });

  it("names a repository's page by its owner and name", () => {
    expect(homeKey("/code/raycast/extensions")).toBe("code/raycast/extensions");
  });

  it("leaves other pages alone", () => {
    expect(homeKey("/writing/the-open-default-principle")).toBeNull();
    expect(homeKey("/rides")).toBeNull();
  });
});

describe("parseHomeKey", () => {
  it("reads back what homeKey wrote", () => {
    expect(parseHomeKey("code/raycast/extensions")).toEqual({
      kind: "code",
      key: "raycast/extensions",
    });
    expect(parseHomeKey("ride/abc")).toEqual({ kind: "ride", id: "abc" });
    expect(parseHomeKey("post/abc")).toBeNull();
  });
});

describe("homeFullHref", () => {
  it("points at the item's own page", () => {
    expect(homeFullHref("code/raycast/extensions")).toBe(
      "/code/raycast/extensions",
    );
    expect(homeFullHref("ride/abc")).toMatch(/^\/rides\/abc/);
  });
});
