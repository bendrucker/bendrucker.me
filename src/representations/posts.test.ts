import { describe, it, expect, vi } from "vitest";
import type { APIContext } from "astro";

const entry = {
  id: "hello-world",
  filePath: "src/content/blog/hello-world.md",
  body: "The body of the post.",
  data: { title: "Hello, World", draft: false, pubDatetime: "2013-01-01" },
};

vi.mock("astro:content", () => ({
  getCollection: (_collection: string, filter?: (e: unknown) => boolean) =>
    Promise.resolve([entry].filter((e) => (filter ? filter(e) : true))),
}));

const { posts } = await import("./posts");

function context(slug: string): APIContext {
  return { params: { slug } } as unknown as APIContext;
}

describe("posts", () => {
  it("renders the post title as an H1 above the body", async () => {
    const md = await posts.render(context("hello-world"));
    expect(md).toBe("# Hello, World\n\nThe body of the post.");
  });

  it("falls through to HTML for an unknown slug", async () => {
    expect(await posts.render(context("nope"))).toBeNull();
  });

  it("falls through to HTML when no slug is given", async () => {
    expect(await posts.render(context(""))).toBeNull();
  });
});
