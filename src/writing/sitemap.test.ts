import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { writingSitemapPages } from "./sitemap";

const SITE = "https://www.bendrucker.me/";
const NOW = new Date("2026-01-01T00:00:00Z");

function blog(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "writing-sitemap-"));
  for (const [file, frontmatter] of Object.entries(files)) {
    const path = join(root, "src/content/blog", file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `---\n${frontmatter}\n---\n\nBody.\n`);
  }
  return root;
}

describe("writingSitemapPages", () => {
  it("lists each published post at its Writing URL", () => {
    const root = blog({
      "going-all-in.md":
        "title: Going All In\npubDatetime: 2014-01-01T12:00:00Z",
      "joining-eaze.md":
        "title: Joining Eaze\npubDatetime: 2015-01-01T12:00:00Z\ndraft: false",
    });
    expect(writingSitemapPages(SITE, { root, now: NOW })).toEqual([
      "https://www.bendrucker.me/writing/going-all-in/",
      "https://www.bendrucker.me/writing/joining-eaze/",
    ]);
  });

  it("leaves out drafts, future posts, and underscored files", () => {
    const root = blog({
      "draft.md": "pubDatetime: 2014-01-01T12:00:00Z\ndraft: true",
      "later.md": "pubDatetime: 2027-01-01T12:00:00Z",
      "_hidden.md": "pubDatetime: 2014-01-01T12:00:00Z",
    });
    expect(writingSitemapPages(SITE, { root, now: NOW })).toEqual([]);
  });

  it("keeps a subdirectory in the path, as the post route does", () => {
    const root = blog({
      "Side Projects/valet.md": "pubDatetime: 2014-01-01T12:00:00Z",
    });
    expect(writingSitemapPages(SITE, { root, now: NOW })).toEqual([
      "https://www.bendrucker.me/writing/side-projects/valet/",
    ]);
  });
});
