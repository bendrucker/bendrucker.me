import { describe, it, expect } from "vitest";
import { readTimestamp } from "./db";

describe("readTimestamp", () => {
  it.each<{ name: string; text: string | null; expected: string | null }>([
    {
      name: "an ISO string the site wrote",
      text: "2026-09-05T06:31:43.900Z",
      expected: "2026-09-05T06:31:43.900Z",
    },
    {
      name: "a datetime('now') default, as UTC",
      text: "2026-09-05 06:31:43",
      expected: "2026-09-05T06:31:43.000Z",
    },
    { name: "a null column", text: null, expected: null },
    { name: "text that is not a date", text: "0", expected: null },
  ])("reads $name", ({ text, expected }) => {
    expect(readTimestamp(text)?.toISOString() ?? null).toBe(expected);
  });
});
