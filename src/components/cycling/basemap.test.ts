import { afterEach, describe, expect, it, vi } from "vitest";
import { hasBasemap, tileUrl } from "./basemap";
import type { MapTile } from "./geo";

const TILE: MapTile = { key: "9_82_197", z: 9, x: 82, y: 197, left: 0, top: 0 };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hasBasemap", () => {
  it("is false without a key", () => {
    vi.stubEnv("PUBLIC_CARTO_BASEMAP_KEY", "");
    expect(hasBasemap()).toBe(false);
  });

  it("is true with one", () => {
    vi.stubEnv("PUBLIC_CARTO_BASEMAP_KEY", "abc123");
    expect(hasBasemap()).toBe(true);
  });
});

describe("tileUrl", () => {
  it("addresses the tile by its own coordinates", () => {
    vi.stubEnv("PUBLIC_CARTO_BASEMAP_KEY", "abc123");
    expect(tileUrl(TILE)).toBe(
      "https://basemaps.cartocdn.com/light_all/9/82/197@2x.png?key=abc123",
    );
  });

  // A key arrives by email and gets pasted into a secret. Escaping it means a
  // stray `&` or `+` cannot silently truncate the query.
  it("escapes a key holding query syntax", () => {
    vi.stubEnv("PUBLIC_CARTO_BASEMAP_KEY", "a+b&c=d");
    expect(tileUrl(TILE)).toContain("?key=a%2Bb%26c%3Dd");
  });
});
