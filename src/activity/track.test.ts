import { describe, expect, it } from "vitest";
import {
  decodePolyline,
  decodeProfile,
  encodePolyline,
  encodeProfile,
  MAX_ROUTE_POINTS,
  thin,
  thinPolyline,
} from "./track";

/** Google's documented polyline example. */
const GOOGLE_EXAMPLE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

describe("encodePolyline", () => {
  it("produces Google's documented encoding", () => {
    expect(
      encodePolyline([
        [38.5, -120.2],
        [40.7, -120.95],
        [43.252, -126.453],
      ]),
    ).toBe(GOOGLE_EXAMPLE);
  });

  it("round-trips through decodePolyline", () => {
    const points = decodePolyline(GOOGLE_EXAMPLE.repeat(50));
    expect(decodePolyline(encodePolyline(points))).toEqual(points);
  });
});

describe("thin", () => {
  it("keeps a short series whole", () => {
    expect(thin([1, 2, 3], 5)).toEqual([1, 2, 3]);
    expect(thin([], 5)).toEqual([]);
  });

  it("bounds a long series and keeps both endpoints", () => {
    const series = Array.from({ length: 1000 }, (_, i) => i);
    const kept = thin(series, 100);
    expect(kept.length).toBeLessThanOrEqual(101);
    expect(kept[0]).toBe(0);
    expect(kept.at(-1)).toBe(999);
  });
});

describe("thinPolyline", () => {
  it("returns a short route unchanged", () => {
    expect(thinPolyline(GOOGLE_EXAMPLE)).toBe(GOOGLE_EXAMPLE);
  });

  it("bounds a full-resolution route and keeps its endpoints", () => {
    // Each repeat re-encodes the same deltas, so the string stays decodable.
    const full = decodePolyline(GOOGLE_EXAMPLE.repeat(400));
    const thinned = decodePolyline(thinPolyline(GOOGLE_EXAMPLE.repeat(400)));
    expect(full).toHaveLength(1200);
    expect(thinned.length).toBeLessThanOrEqual(MAX_ROUTE_POINTS + 1);
    expect(thinned[0]).toEqual(full[0]);
    expect(thinned.at(-1)).toEqual(full.at(-1));
  });
});

describe("encodeProfile", () => {
  it("spells each sample as two hex digits", () => {
    expect(encodeProfile([0, 1])).toBe("00ff");
  });

  it("round-trips the endpoints exactly", () => {
    expect(decodeProfile(encodeProfile([0, 1, 0]))).toEqual([0, 1, 0]);
  });

  it("round-trips the samples between them to within a level", () => {
    const samples = Array.from({ length: 100 }, (_, i) => i / 99);
    decodeProfile(encodeProfile(samples)).forEach((sample, index) => {
      expect(sample).toBeCloseTo(samples[index]!, 2);
    });
  });

  it("holds a sample outside 0..1, or no number at all, inside the range", () => {
    expect(decodeProfile(encodeProfile([-3, 4, Number.NaN]))).toEqual([
      0, 1, 0,
    ]);
  });
});

describe("decodeProfile", () => {
  it("returns nothing for an empty string", () => {
    expect(decodeProfile("")).toEqual([]);
  });

  it("drops a trailing half sample", () => {
    expect(decodeProfile("00ff0")).toEqual([0, 1]);
  });

  it("stops at a character outside the alphabet", () => {
    expect(decodeProfile("00zz ff")).toEqual([0]);
  });
});
