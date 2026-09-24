import { afterEach, describe, expect, it, test, vi } from "vitest";
import {
  activityDate,
  activityYear,
  createdLabel,
  isNewRepo,
  readerClock,
  serverClock,
  type Clock,
} from "./clock";

const originalZone = process.env.TZ;

afterEach(() => {
  process.env.TZ = originalZone;
});

function inZones<T>(zones: string[], fn: () => T): T[] {
  return zones.map((zone) => {
    process.env.TZ = zone;
    return fn();
  });
}

const renderedAt = "2026-09-22T03:30:00Z";

describe("serverClock", () => {
  // Hydration fails unless the browser's first render repeats the Worker's
  // text, whatever zone the reader's browser is in.
  it("writes the same dates in every process zone", () => {
    const render = () => {
      const clock = serverClock(renderedAt);
      return [
        "2026-09-22T03:01:00Z",
        "2026-09-21T20:00:00Z",
        "2026-09-18T02:00:00Z",
      ].map((value) => [
        activityDate(value, clock),
        createdLabel(value, clock),
        isNewRepo(value, clock),
      ]);
    };
    expect(
      inZones(["UTC", "America/Los_Angeles"], () =>
        new Date("2026-09-18T02:00:00Z").getDate(),
      ),
    ).toEqual([18, 17]);

    const [utc, ...others] = inZones(
      ["UTC", "America/Los_Angeles", "Pacific/Kiritimati"],
      render,
    );
    for (const other of others) expect(other).toEqual(utc);
  });
});

describe("readerClock", () => {
  // A card added by a later page of results is dated from when it arrives.
  it("reads the time afresh", () => {
    vi.useFakeTimers();
    try {
      const clock = readerClock();
      vi.setSystemTime(new Date("2026-09-22T03:00:00Z"));
      const first = clock.now;
      vi.setSystemTime(new Date("2026-09-22T04:00:00Z"));
      expect(clock.now.getTime() - first.getTime()).toBe(60 * 60 * 1000);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("activityDate", () => {
  test.each<{ name: string; value: string; zone: string; expected: string }>([
    {
      name: "counts minutes on the same day",
      value: "2026-09-22T03:01:00Z",
      zone: "UTC",
      expected: "29 minutes ago",
    },
    {
      name: "names the previous day",
      value: "2026-09-21T20:00:00Z",
      zone: "UTC",
      expected: "Yesterday",
    },
    {
      name: "falls back to the month and day",
      value: "2026-09-18T02:00:00Z",
      zone: "UTC",
      expected: "Sep 18",
    },
    {
      name: "reads an older day in the clock's zone",
      value: "2026-09-18T02:00:00Z",
      zone: "America/Los_Angeles",
      expected: "Sep 17",
    },
    {
      name: "reads yesterday in UTC as today in the clock's zone",
      value: "2026-09-21T20:00:00Z",
      zone: "America/Los_Angeles",
      expected: "8 hours ago",
    },
  ])("$name", ({ value, zone, expected }) => {
    const clock: Clock = { now: new Date(renderedAt), zone };
    expect(activityDate(value, clock).relative).toBe(expected);
  });
});

describe("isNewRepo", () => {
  const clock = serverClock(renderedAt);

  it("marks a repo created within 90 days", () => {
    expect(isNewRepo("2026-07-01T00:00:00Z", clock)).toBe(true);
    expect(isNewRepo("2026-06-01T00:00:00Z", clock)).toBe(false);
  });
});

describe("activityYear", () => {
  it("reads the year in UTC", () => {
    expect(
      inZones(["UTC", "America/Los_Angeles"], () =>
        activityYear("2026-01-01T02:00:00Z"),
      ),
    ).toEqual([2026, 2026]);
  });
});
