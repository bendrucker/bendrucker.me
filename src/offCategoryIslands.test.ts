import path from "node:path";
import { describe, expect, test } from "vitest";
import { SITE } from "./config";
import { isOffCategoryIsland } from "./offCategoryIslands";

const production = { DEV: false };
const everything = { DEV: false, PUBLIC_ALL_CATEGORIES: "1" };
const media = (name: string) =>
  path.resolve("src", "components", "media", name);

const { reading, watching, listening } = SITE.categories;

describe("isOffCategoryIsland", () => {
  test.each<{ name: string; file: string; expected: boolean }>([
    {
      name: "a shelf of posters",
      file: media("PosterShelf.vue"),
      expected: !reading && !watching,
    },
    {
      name: "a shelf of records",
      file: media("RecordShelf.vue"),
      expected: !listening,
    },
    {
      name: "the shared media list",
      file: media("MediaList.vue"),
      expected: !reading && !watching && !listening,
    },
    {
      name: "a ride component",
      file: path.resolve("src/components/rides/RideGallery.vue"),
      expected: false,
    },
    {
      name: "a media module that is not a component",
      file: media("filters.ts"),
      expected: false,
    },
  ])("in production, $name", ({ file, expected }) => {
    expect(isOffCategoryIsland(file, production)).toBe(expected);
  });

  test.each(["PosterShelf.vue", "RecordShelf.vue", "MediaList.vue"])(
    "keeps %s with every category on",
    (name) => {
      expect(isOffCategoryIsland(media(name), everything)).toBe(false);
    },
  );
});
