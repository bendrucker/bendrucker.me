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
  it("addresses the ride, its track, and the size", () => {
    expect(mapImageUrl("42", ROUTE, 150, 140, "light")).toBe(
      `/map/42/${routeHash(ROUTE)}/150x140.png`,
    );
  });

  it("names the dark render separately", () => {
    expect(mapImageUrl("42", ROUTE, 150, 140, "dark")).toBe(
      `/map/42/${routeHash(ROUTE)}/150x140-dark.png`,
    );
  });

  // The two themes are fetched as separate images, so they must not collide.
  it("gives the themes different urls", () => {
    expect(mapImageUrl("42", ROUTE, 150, 140, "light")).not.toBe(
      mapImageUrl("42", ROUTE, 150, 140, "dark"),
    );
  });

  it("escapes an id that would otherwise reshape the path", () => {
    expect(mapImageUrl("a/b", ROUTE, 150, 140, "light")).toContain(
      "/map/a%2Fb/",
    );
  });

  // A re-synced ride keeps its id, so the hash is the only thing that retires
  // an image already cached as immutable.
  it("moves to a new url when the track changes", () => {
    expect(mapImageUrl("42", ROUTE, 150, 140, "light")).not.toBe(
      mapImageUrl("42", `${ROUTE}?`, 150, 140, "light"),
    );
  });
});
