import { describe, expect, it } from "vitest";
import { loadMediaFeed } from "./load";

describe("loadMediaFeed", () => {
  it("orders rows newest first", async () => {
    for (const id of ["reading", "watching", "listening"] as const) {
      const { rows } = await loadMediaFeed(id);
      const days = rows.map((r) => r.day);
      expect(days).toEqual(days.toSorted().toReversed());
    }
  });

  it("ranks Listening by plays, which no row carries", async () => {
    const { rows, highlightKeys } = await loadMediaFeed("listening");
    const byKey = new Map(rows.map((r) => [r.key, r.title]));
    // The Daily and Hard Fork tie on plays, so the newer leads.
    expect(highlightKeys.slice(0, 5).map((k) => byKey.get(k))).toEqual([
      "Promises",
      "Brat",
      "The Daily",
      "Hard Fork",
      "Cowboy Carter",
    ]);
    expect(rows.some((r) => "plays" in r)).toBe(false);
  });

  it("draws a show's episodes as ticks and leaves a movie without", async () => {
    const { rows } = await loadMediaFeed("watching");
    const silo = rows.find((r) => r.title === "Silo");
    expect(silo?.ticks).toEqual([1, 1, 1, 1, 1, 1, 1, 0, 0, 0]);
    expect(silo?.tickLabel).toBe("7 of 10 episodes watched");
    expect(rows.find((r) => r.title === "Sinners")?.ticks).toBeUndefined();
  });

  it("leaves a finished season without ticks", async () => {
    const { rows } = await loadMediaFeed("watching");
    const severance = rows.find((r) => r.title === "Severance");
    expect(severance?.season).toBe(2);
    expect(severance?.ticks).toBeUndefined();
  });

  it("carries an album's label color and every row's way out", async () => {
    const { rows } = await loadMediaFeed("listening");
    expect(rows.find((r) => r.title === "Blonde")?.label).toBe("#9fb4a5");
    expect(rows.every((r) => r.url.startsWith("https://"))).toBe(true);
  });

  it("leaves art off a row that has none, so its tile shows", async () => {
    const { rows } = await loadMediaFeed("listening");
    expect(rows.find((r) => r.title === "The Daily")).not.toHaveProperty("art");
    expect(rows.find((r) => r.title === "Promises")?.art).toBeDefined();
  });
});
