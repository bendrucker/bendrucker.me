import { describe, expect, it } from "vitest";
import {
  HIGHLIGHT_MAP,
  isMapSize,
  mapImageUrl,
  RIDE_MAP,
  routeHash,
} from "./basemap";

const ROUTE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

describe("isMapSize", () => {
  it("accepts the sizes the cards ask for", () => {
    expect(isMapSize(RIDE_MAP.width, RIDE_MAP.height)).toBe(true);
    expect(isMapSize(HIGHLIGHT_MAP.width, HIGHLIGHT_MAP.height)).toBe(true);
  });

  // Rendering costs tile fetches, so an arbitrary size is not something the
  // endpoint will do on request.
  it("refuses anything else", () => {
    expect(isMapSize(150, 141)).toBe(false);
    expect(isMapSize(4000, 4000)).toBe(false);
  });
});

describe("routeHash", () => {
  it("is stable for the same route", () => {
    expect(routeHash(ROUTE)).toBe(routeHash(ROUTE));
  });

  it("changes when the route does", () => {
    expect(routeHash(ROUTE)).not.toBe(routeHash(`${ROUTE}?`));
  });

  it("is URL safe", () => {
    expect(routeHash(ROUTE)).toMatch(/^[0-9a-z]+$/);
  });
});

describe("mapImageUrl", () => {
  it.each<{
    theme: "light" | "dark";
    scale?: 1 | 2;
    suffix: string;
  }>([
    { theme: "light", suffix: "" },
    { theme: "light", scale: 1, suffix: "" },
    { theme: "light", scale: 2, suffix: "@2x" },
    { theme: "dark", suffix: "-dark" },
    { theme: "dark", scale: 1, suffix: "-dark" },
    { theme: "dark", scale: 2, suffix: "@2x-dark" },
  ])(
    "addresses the ride, its track, and the $theme size at $scale x",
    ({ theme, scale, suffix }) => {
      expect(
        mapImageUrl({
          id: "42",
          route: ROUTE,
          width: 150,
          height: 140,
          theme,
          scale,
        }),
      ).toBe(`/map/42/${routeHash(ROUTE)}/150x140${suffix}.png`);
    },
  );

  // The two themes are fetched as separate images, so they must not collide.
  it("gives the themes different urls", () => {
    const url = (theme: "light" | "dark") =>
      mapImageUrl({ id: "42", route: ROUTE, width: 150, height: 140, theme });
    expect(url("light")).not.toBe(url("dark"));
  });

  // The two scales are fetched as separate images for `srcset` to choose
  // between, so they must not collide either.
  it("gives the scales different urls", () => {
    const url = (scale: 1 | 2) =>
      mapImageUrl({
        id: "42",
        route: ROUTE,
        width: 150,
        height: 140,
        theme: "light",
        scale,
      });
    expect(url(1)).not.toBe(url(2));
  });

  it("escapes an id that would otherwise reshape the path", () => {
    expect(
      mapImageUrl({
        id: "a/b",
        route: ROUTE,
        width: 150,
        height: 140,
        theme: "light",
      }),
    ).toContain("/map/a%2Fb/");
  });

  // A re-synced ride keeps its id, so the hash is the only thing that retires
  // an image already cached as immutable.
  it("moves to a new url when the track changes", () => {
    expect(
      mapImageUrl({
        id: "42",
        route: ROUTE,
        width: 150,
        height: 140,
        theme: "light",
      }),
    ).not.toBe(
      mapImageUrl({
        id: "42",
        route: `${ROUTE}?`,
        width: 150,
        height: 140,
        theme: "light",
      }),
    );
  });
});
