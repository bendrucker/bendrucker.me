import { describe, it, expect } from "vitest";
import { activityMaxAge, cacheControl, DEFAULT_CACHE_CONTROL } from "./cache";

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

describe("cacheControl", () => {
  const now = new Date("2026-07-06T12:30:00Z");

  it("uses the default policy outside /activity", () => {
    expect(cacheControl("/posts/some-post/", now)).toBe(DEFAULT_CACHE_CONTROL);
    expect(cacheControl("/", now)).toBe(DEFAULT_CACHE_CONTROL);
  });

  it("aligns /activity max-age to the next data sync", () => {
    expect(cacheControl("/activity/code", now)).toBe(
      "public, max-age=2100, stale-while-revalidate=3600",
    );
  });
});
