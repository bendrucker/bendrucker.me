import { describe, expect, it } from "vitest";
import { tagRedirect } from "./redirects";

describe("tagRedirect", () => {
  it("sends a tag's page to Writing filtered by that tag", () => {
    expect(tagRedirect("/tags/startups/")).toBe("/writing?tag=startups");
    expect(tagRedirect("/tags/open-source")).toBe("/writing?tag=open-source");
  });

  it("drops the old page number", () => {
    expect(tagRedirect("/tags/startups/2/")).toBe("/writing?tag=startups");
  });

  it("sends the tag index to Writing", () => {
    expect(tagRedirect("/tags")).toBe("/writing");
    expect(tagRedirect("/tags/")).toBe("/writing");
  });

  it("re-encodes an escaped tag once", () => {
    expect(tagRedirect("/tags/open%20source/")).toBe(
      "/writing?tag=open+source",
    );
  });

  it("leaves every other path alone", () => {
    expect(tagRedirect("/tagsale")).toBeUndefined();
    expect(tagRedirect("/writing")).toBeUndefined();
    expect(tagRedirect("/posts/tags/x")).toBeUndefined();
  });
});
