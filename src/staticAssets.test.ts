import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { SITE } from "./config";
import { copyStaticAssets, isPublished } from "./staticAssets";

const production = { DEV: false };
const everything = { DEV: false, PUBLIC_ALL_CATEGORIES: "1" };

describe("isPublished", () => {
  test.each<{ name: string; path: string; expected: boolean }>([
    { name: "a file outside fixtures", path: "favicon.svg", expected: true },
    { name: "a nested non-fixture", path: "images/a.png", expected: true },
    { name: "the fixtures directory", path: "fixtures", expected: true },
    {
      name: "art for a category that is off",
      path: "fixtures/watching/silo.jpg",
      expected: false,
    },
    {
      name: "a category directory that is off",
      path: "fixtures/listening",
      expected: false,
    },
    {
      name: "art for a category that is on",
      path: "fixtures/rides/a.jpg",
      expected: true,
    },
    {
      name: "art outside any category",
      path: "fixtures/stray.jpg",
      expected: false,
    },
    {
      name: "a prototype key",
      path: "fixtures/constructor/a.jpg",
      expected: false,
    },
  ])("$name", ({ path, expected }) => {
    expect(isPublished(path, production)).toBe(expected);
  });

  test("follows the category switch", () => {
    for (const [category, on] of Object.entries(SITE.categories)) {
      expect(isPublished(`fixtures/${category}/a.jpg`, production)).toBe(on);
    }
  });

  test.each([
    { name: "in development", env: { DEV: true } },
    { name: "with every category on", env: everything },
  ])("keeps every fixture $name", ({ env }) => {
    expect(isPublished("fixtures/watching/silo.jpg", env)).toBe(true);
  });
});

function tree(root: string, files: string[]) {
  for (const file of files) {
    const path = join(root, file);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "");
  }
}

function list(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isDirectory() || entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(root.length + 1))
    .toSorted();
}

describe("copyStaticAssets", () => {
  test.each([
    {
      name: "drops art left by an earlier build, and its empty directories",
      env: production,
      expected: ["favicon.svg"],
    },
    {
      name: "copies every fixture with every category on",
      env: everything,
      expected: [
        "favicon.svg",
        "fixtures",
        "fixtures/watching",
        "fixtures/watching/silo.jpg",
      ],
    },
  ])("$name", ({ env, expected }) => {
    const dir = mkdtempSync(join(tmpdir(), "static-assets-"));
    const src = join(dir, "static");
    const dest = join(dir, "public");
    tree(src, ["favicon.svg", "fixtures/watching/silo.jpg"]);
    tree(dest, ["fixtures/watching/stale.jpg"]);

    copyStaticAssets(src, dest, env);

    expect(list(dest)).toEqual(expected);
  });
});
