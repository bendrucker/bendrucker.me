import { describe, expect, test } from "vitest";
import { transitionName as codeTransitionName } from "@/code/view";
import { rideTransitionName } from "@/rides/links";
import { transitionName as postTransitionName } from "@/writing/rows";
import { isList, itemTransitionName } from "./names";

describe("isList", () => {
  test.each<{ name: string; pathname: string; expected: boolean }>([
    { name: "home", pathname: "/", expected: true },
    { name: "rides", pathname: "/rides", expected: true },
    {
      name: "rides with a trailing slash",
      pathname: "/rides/",
      expected: true,
    },
    { name: "code", pathname: "/code", expected: true },
    { name: "writing", pathname: "/writing", expected: true },
    { name: "a ride", pathname: "/rides/123", expected: false },
    { name: "reading", pathname: "/reading", expected: false },
    { name: "about", pathname: "/about", expected: false },
  ])("$name", ({ pathname, expected }) => {
    expect(isList(pathname)).toBe(expected);
  });
});

describe("itemTransitionName", () => {
  test.each<{ name: string; pathname: string; expected: string | null }>([
    {
      name: "a ride",
      pathname: "/rides/123",
      expected: rideTransitionName("123"),
    },
    {
      name: "a repository",
      pathname: "/code/bendrucker/bendrucker.me",
      expected: codeTransitionName("bendrucker/bendrucker.me"),
    },
    {
      name: "an escaped repository",
      pathname: "/code/some%20org/repo",
      expected: codeTransitionName("some org/repo"),
    },
    {
      name: "a project",
      pathname: "/code/terraform",
      expected: codeTransitionName("terraform"),
    },
    {
      name: "a post",
      pathname: "/writing/2024/hello",
      expected: postTransitionName("/writing/2024/hello"),
    },
    {
      name: "a post with a trailing slash",
      pathname: "/writing/2024/hello/",
      expected: postTransitionName("/writing/2024/hello"),
    },
    {
      name: "a post's OG image",
      pathname: "/writing/hello/index.png",
      expected: null,
    },
    { name: "a list", pathname: "/rides", expected: null },
    { name: "home", pathname: "/", expected: null },
    {
      name: "a ride's nested path",
      pathname: "/rides/123/map",
      expected: null,
    },
  ])("$name", ({ pathname, expected }) => {
    expect(itemTransitionName(pathname)).toBe(expected);
  });
});
