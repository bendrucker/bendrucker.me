import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { markDegraded, trackDegraded } from "./degraded";

describe("trackDegraded", () => {
  it("reports a render that read everything", async () => {
    expect(await trackDegraded(async () => "page")).toEqual({
      value: "page",
      degraded: false,
    });
  });

  it("reports a failed read marked after an await", async () => {
    const { degraded } = await trackDegraded(async () => {
      await delay(1);
      markDegraded();
    });

    expect(degraded).toBe(true);
  });

  it("keeps one request's failure off another rendering beside it", async () => {
    const [failed, clean] = await Promise.all([
      trackDegraded(async () => {
        await delay(1);
        markDegraded();
      }),
      trackDegraded(async () => delay(2)),
    ]);

    expect(failed.degraded).toBe(true);
    expect(clean.degraded).toBe(false);
  });

  it("ignores a mark made outside any render", () => {
    expect(() => markDegraded()).not.toThrow();
  });
});
