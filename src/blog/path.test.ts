import { describe, expect, it } from "vitest";
import { getPath, getSlug } from "./path";

describe("getSlug", () => {
  it("returns the file name for a post at the collection root", () => {
    expect(getSlug("going-all-in", "src/content/blog/going-all-in.md")).toBe(
      "going-all-in",
    );
  });

  it("keeps the directories a post is nested under", () => {
    expect(
      getSlug("2016/going-all-in", "src/content/blog/2016/going-all-in.md"),
    ).toBe("2016/going-all-in");
  });

  it("slugifies directory names", () => {
    expect(
      getSlug(
        "Old Posts/going-all-in",
        "src/content/blog/Old Posts/going-all-in.md",
      ),
    ).toBe("old-posts/going-all-in");
  });

  it("drops directories marked as excluded", () => {
    expect(
      getSlug(
        "_drafts/going-all-in",
        "src/content/blog/_drafts/going-all-in.md",
      ),
    ).toBe("going-all-in");
  });

  it("falls back to the id when the file path is unknown", () => {
    expect(getSlug("going-all-in", undefined)).toBe("going-all-in");
  });

  // A rest param supplies the separator itself, so a leading slash here would
  // build `/posts//going-all-in` and the route would never match.
  it("has no leading or trailing slash", () => {
    const slug = getSlug("going-all-in", "src/content/blog/going-all-in.md");
    expect(slug.startsWith("/")).toBe(false);
    expect(slug.endsWith("/")).toBe(false);
  });
});

describe("getPath", () => {
  // `trailingSlash: "always"` redirects the bare form, so a link without the
  // slash costs every reader and every crawler a redirect.
  it("roots the slug at /posts and keeps the canonical trailing slash", () => {
    expect(getPath("going-all-in", "src/content/blog/going-all-in.md")).toBe(
      "/posts/going-all-in/",
    );
  });

  it("roots a nested slug at /posts", () => {
    expect(
      getPath("2016/going-all-in", "src/content/blog/2016/going-all-in.md"),
    ).toBe("/posts/2016/going-all-in/");
  });
});
