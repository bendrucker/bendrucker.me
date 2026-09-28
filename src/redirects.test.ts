import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STATIC_REDIRECTS } from "./redirects";

const PAGES = join(import.meta.dirname, "pages");

/** Whether a path renders from a page or an endpoint rather than falling through to 404. */
function hasPage(path: string): boolean {
  const base = join(PAGES, path);
  return [`${base}.astro`, `${base}.ts`, join(base, "index.astro")].some(
    (file) => existsSync(file),
  );
}

/** The `static/_redirects` rules, as `[from, to, status]`. */
function cloudflareRules(): string[][] {
  return readFileSync(
    join(import.meta.dirname, "..", "static", "_redirects"),
    "utf8",
  )
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => line.split(/\s+/));
}

describe("STATIC_REDIRECTS", () => {
  it("sends each retired page to the route that replaced it", () => {
    expect(STATIC_REDIRECTS).toEqual({
      "/activity/cycling": "/rides",
      "/activity/code": "/code",
      "/activity/code.md": "/code.md",
      "/posts": "/writing",
      "/archives": "/writing",
    });
  });

  it("lands every redirect on a page that exists", () => {
    for (const to of Object.values(STATIC_REDIRECTS)) {
      expect(hasPage(to), to).toBe(true);
    }
  });

  it("leaves no page behind at an address it redirects", () => {
    for (const from of Object.keys(STATIC_REDIRECTS)) {
      expect(hasPage(from), from).toBe(false);
    }
  });

  it("keeps the Rides route's JSON under /activity/cycling", () => {
    const cycling = join(PAGES, "activity", "cycling");
    expect(existsSync(join(cycling, "[month].json.ts"))).toBe(true);
    expect(existsSync(join(cycling, "rides.json.ts"))).toBe(true);
  });
});

describe("static/_redirects", () => {
  it("moves a post and its OG image to Writing, and a post page to the list", () => {
    expect(cloudflareRules()).toEqual(
      expect.arrayContaining([
        ["/posts/page", "/writing", "301"],
        ["/posts/page/*", "/writing", "301"],
        ["/posts/*", "/writing/:splat", "301"],
      ]),
    );
  });

  it.each(["/posts", "/blog"])(
    "matches %s pages before the catch-all that would keep their path",
    (prefix) => {
      const froms = cloudflareRules().map(([from]) => from);
      const catchAll = froms.indexOf(`${prefix}/*`);
      for (const page of [`${prefix}/page`, `${prefix}/page/*`]) {
        expect(froms.indexOf(page), page).toBeGreaterThanOrEqual(0);
        expect(froms.indexOf(page), page).toBeLessThan(catchAll);
      }
    },
  );
});
