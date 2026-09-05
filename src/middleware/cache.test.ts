import { describe, it, expect } from "vitest";
import {
  activityCachePolicy,
  activityETag,
  activityMaxAge,
  cachesResponse,
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
  const versions = {
    github: 7,
    feed: "3.2026-09-01T10:00:00.000Z",
    deploy: "a1b2c3d4",
  };

  it("separates the representations served at one URL", () => {
    expect(activityETag(versions, "html")).toBe(
      'W/"7-3.2026-09-01T10:00:00.000Z-a1b2c3d4-html"',
    );
    expect(activityETag(versions, "md")).toBe(
      'W/"7-3.2026-09-01T10:00:00.000Z-a1b2c3d4-md"',
    );
  });

  it("moves with either dataset and with a deploy", () => {
    const html = activityETag(versions, "html");
    expect(activityETag({ ...versions, github: 8 }, "html")).not.toBe(html);
    expect(activityETag({ ...versions, feed: "4.0" }, "html")).not.toBe(html);
    expect(activityETag({ ...versions, deploy: "e5f6" }, "html")).not.toBe(
      html,
    );
  });
});

describe("etagMatches", () => {
  const etag = activityETag({ github: 7, feed: "0.0", deploy: "v1" }, "html");

  it("ignores a request with no validator", () => {
    expect(etagMatches(null, etag)).toBe(false);
    expect(etagMatches("", etag)).toBe(false);
  });

  it("matches the same version and representation", () => {
    expect(etagMatches('"7-0.0-v1-html"', etag)).toBe(true);
    expect(etagMatches('"6-0.0-v1-html"', etag)).toBe(false);
    expect(etagMatches('"7-0.0-v1-md"', etag)).toBe(false);
  });

  it("compares weakly", () => {
    expect(etagMatches('W/"7-0.0-v1-html"', etag)).toBe(true);
  });

  it("accepts any entry in a list, and the wildcard", () => {
    expect(etagMatches('"6-0.0-v1-html", "7-0.0-v1-html"', etag)).toBe(true);
    expect(etagMatches("*", etag)).toBe(true);
  });
});

function outcome(status: number, cacheControl: string | null, routed = false) {
  const headers = new Headers();
  if (cacheControl !== null) headers.set("cache-control", cacheControl);
  return { status, headers, routed };
}

describe("cachesResponse", () => {
  it("caches a plain rendered response", () => {
    expect(cachesResponse(outcome(200, null))).toBe(true);
  });

  it("turns down anything that did not render", () => {
    expect(cachesResponse(outcome(404, null))).toBe(false);
    expect(cachesResponse(outcome(302, null))).toBe(false);
  });

  it("turns down a response that manages its own caching", () => {
    expect(cachesResponse(outcome(200, "no-store"))).toBe(false);
  });

  // The map images set `Cache-Control` for the browser and a policy of their
  // own for the edge. Reading the first as a request to skip the edge would
  // rasterize every image again for every cold client.
  it("keeps the policy a route set for itself", () => {
    expect(cachesResponse(outcome(200, "public, max-age=31536000", true))).toBe(
      true,
    );
    expect(cachesResponse(outcome(302, "public, max-age=300", true))).toBe(
      true,
    );
  });
});
