import { describe, it, expect } from "vitest";
import { activityMaxAge, cachePolicy, DEFAULT_CACHE_POLICY } from "./cache";

describe("activityMaxAge", () => {
  it("expires at five past the next hour mid-hour", () => {
    const now = new Date("2026-07-06T12:30:00Z");
    expect(activityMaxAge(now)).toBe(35 * 60);
  });

  it("expires at five past the current hour during the sync window", () => {
    const now = new Date("2026-07-06T13:02:00Z");
    expect(activityMaxAge(now)).toBe(3 * 60);
  });

  it("rolls to the next hour exactly at the sync mark", () => {
    const now = new Date("2026-07-06T13:05:00Z");
    expect(activityMaxAge(now)).toBe(60 * 60);
  });

  it("stays positive just before the sync mark", () => {
    const now = new Date("2026-07-06T13:04:59.500Z");
    expect(activityMaxAge(now)).toBe(1);
  });
});

describe("cachePolicy", () => {
  const now = new Date("2026-07-06T12:30:00Z");

  it("uses the default policy outside /activity", () => {
    expect(cachePolicy("/posts/some-post/", now)).toEqual(DEFAULT_CACHE_POLICY);
    expect(cachePolicy("/", now)).toEqual(DEFAULT_CACHE_POLICY);
  });

  it("aligns /activity max-age to the next data sync", () => {
    expect(cachePolicy("/activity/code", now)).toEqual({
      maxAge: 2100,
      swr: 3600,
    });
  });
});
