import { describe, expect, test } from "vitest";
import { isSwitchedOff } from "./config";

describe("isSwitchedOff", () => {
  const production = { DEV: false };

  test.each<{ name: string; pathname: string; expected: boolean }>([
    { name: "a route that is off", pathname: "/reading", expected: true },
    {
      name: "beneath a route that is off",
      pathname: "/listening/x",
      expected: true,
    },
    { name: "with a trailing slash", pathname: "/watching/", expected: true },
    { name: "a route that is on", pathname: "/rides", expected: false },
    {
      name: "beneath a route that is on",
      pathname: "/code/a/b",
      expected: false,
    },
    { name: "home", pathname: "/", expected: false },
    {
      name: "a page outside any category",
      pathname: "/about",
      expected: false,
    },
    { name: "a prototype key", pathname: "/constructor", expected: false },
  ])("$name", ({ pathname, expected }) => {
    expect(isSwitchedOff(pathname, production)).toBe(expected);
  });

  test("lists every route when every category is on", () => {
    expect(isSwitchedOff("/reading", { PUBLIC_ALL_CATEGORIES: "1" })).toBe(
      false,
    );
  });
});
