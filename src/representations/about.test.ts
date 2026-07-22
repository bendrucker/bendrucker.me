import { describe, it, expect } from "vitest";
import type { APIContext } from "astro";
import { about } from "./about";

const context = {} as APIContext;

describe("about", () => {
  it("renders with an H1 title above the body", async () => {
    const md = await about.render(context);
    expect(md?.startsWith("# About\n\n")).toBe(true);
    expect(md).toContain("## Code");
  });

  it("strips the frontmatter", async () => {
    const md = await about.render(context);
    expect(md).not.toContain("layout:");
  });

  it("lists itself once", async () => {
    const entries = await about.list();
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe("/about");
    expect(entries[0].title).toBe("About");
  });
});
