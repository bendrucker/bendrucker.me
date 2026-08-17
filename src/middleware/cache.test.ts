import { describe, it, expect } from "vitest";
import {
  activityCachePolicy,
  activityETag,
  activityMaxAge,
  etagMatches,
  isActivityPath,
} from "./cache";

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

describe("isActivityPath", () => {
  it("matches the routes whose freshness tracks the sync", () => {
    expect(isActivityPath("/activity/code")).toBe(true);
    expect(isActivityPath("/activity/code/2024")).toBe(true);
  });

  it("leaves everything else to routeRules", () => {
    expect(isActivityPath("/")).toBe(false);
    expect(isActivityPath("/posts/some-post")).toBe(false);
    expect(isActivityPath("/llms.txt")).toBe(false);
  });
});

describe("activityCachePolicy", () => {
  it("aligns max-age to the next data sync", () => {
    expect(activityCachePolicy(new Date("2026-07-06T12:30:00Z"))).toEqual({
      maxAge: 2100,
      swr: 3600,
    });
  });
});

describe("activityETag", () => {
  it("separates the representations served at one URL", () => {
    expect(activityETag(7, "html")).toBe('"7-html"');
    expect(activityETag(7, "md")).toBe('"7-md"');
  });
});

describe("etagMatches", () => {
  const etag = activityETag(7, "html");

  it("ignores a request with no validator", () => {
    expect(etagMatches(null, etag)).toBe(false);
    expect(etagMatches("", etag)).toBe(false);
  });

  it("matches the same version and representation", () => {
    expect(etagMatches('"7-html"', etag)).toBe(true);
    expect(etagMatches('"6-html"', etag)).toBe(false);
    expect(etagMatches('"7-md"', etag)).toBe(false);
  });

  it("compares weakly", () => {
    expect(etagMatches('W/"7-html"', etag)).toBe(true);
  });

  it("accepts any entry in a list, and the wildcard", () => {
    expect(etagMatches('"6-html", "7-html"', etag)).toBe(true);
    expect(etagMatches("*", etag)).toBe(true);
  });
});
