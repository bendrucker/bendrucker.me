import { describe, it, expect, test } from "vitest";
import {
  elevationOf,
  lookupClimbNames,
  overpassQuery,
  pickClimbName,
  type OverpassElement,
} from "./climb-name";
import type { Coordinate } from "./types";

const METRES_PER_DEGREE = 111_195;

function offset(origin: Coordinate, north: number, east: number): Coordinate {
  return [
    origin[0] + north / METRES_PER_DEGREE,
    origin[1] +
      east / (METRES_PER_DEGREE * Math.cos((origin[0] * Math.PI) / 180)),
  ];
}

function peak(name: string, at: Coordinate, ele?: string): OverpassElement {
  return {
    type: "node",
    lat: at[0],
    lon: at[1],
    tags: { natural: "peak", name, ...(ele === undefined ? {} : { ele }) },
  };
}

function way(name: string, highway: string, line: Coordinate[]) {
  return {
    type: "way" as const,
    geometry: line.map(([lat, lon]) => ({ lat, lon })),
    tags: { highway, name },
  };
}

/** A road running east to west that passes `north` metres from `origin`. */
function roadPast(
  origin: Coordinate,
  name: string,
  highway: string,
  north: number,
): OverpassElement {
  return way(name, highway, [
    offset(origin, north, -200),
    offset(origin, north, 200),
  ]);
}

const summit: Coordinate = [37.9235, -122.5965];

describe("pickClimbName", () => {
  test.each<{
    name: string;
    elements: OverpassElement[];
    expected: string | null;
  }>([
    {
      name: "names a climb after a peak and drops its directional suffix",
      elements: [
        peak("Mount Tamalpais West Peak", offset(summit, 367, 0)),
        roadPast(summit, "Ridgecrest Boulevard", "tertiary", 10),
      ],
      expected: "Mount Tamalpais",
    },
    {
      name: "names a climb after the tallest peak in reach, not a nearer knoll",
      elements: [
        peak("Mount Love", offset(summit, 0, 172), "1955.79"),
        peak("Kuwohi", offset(summit, 0, -582), "2024.79"),
        roadPast(summit, "Kuwohi Access Road", "residential", 5),
      ],
      expected: "Kuwohi",
    },
    {
      name: "ranks a peak without an elevation below one with it",
      elements: [
        peak("Unsurveyed Knob", offset(summit, 0, 50)),
        peak("Mount Diablo", offset(summit, 0, 400), "1173"),
      ],
      expected: "Mount Diablo",
    },
    {
      name: "takes the road when the only peak stands too far away",
      elements: [
        peak("Ballou Point", offset(summit, 0, 1212)),
        roadPast(summit, "Tunitas Creek Road", "secondary", 20),
      ],
      expected: "Tunitas Creek",
    },
    {
      name: "prefers a road to a nearer fire trail",
      elements: [
        roadPast(summit, "Cadd Dunlavy Fire Trail", "track", 5),
        roadPast(summit, "Pine Flat Road", "unclassified", 40),
      ],
      expected: "Pine Flat",
    },
    {
      name: "ignores a road gathered for another summit",
      elements: [roadPast(summit, "Geysers Road", "unclassified", 500)],
      expected: null,
    },
    {
      name: "names nothing when OpenStreetMap has nothing nearby",
      elements: [],
      expected: null,
    },
  ])("$name", ({ elements, expected }) => {
    expect(pickClimbName(elements, summit)).toBe(expected);
  });
});

const rateLimited: typeof fetch = async () =>
  new Response("rate limited", { status: 429 });

const malformed: typeof fetch = async () => Response.json({ nope: true });

const unreachable: typeof fetch = async () => {
  throw new Error("should not be called");
};

describe("lookupClimbNames", () => {
  const other: Coordinate = [37.8816, -121.9142];

  it("names every summit from a single request", async () => {
    const requests: unknown[] = [];
    const fetcher: typeof fetch = async (_input, init) => {
      requests.push(init?.body);
      return Response.json({
        elements: [
          peak("Mount Diablo", offset(other, 100, 0)),
          { type: "relation", id: 1 },
        ],
      });
    };

    expect(await lookupClimbNames([summit, other], fetcher)).toEqual([
      null,
      "Mount Diablo",
    ]);
    expect(requests).toHaveLength(1);
  });

  it("names nothing when Overpass turns the request away", async () => {
    expect(await lookupClimbNames([summit, other], rateLimited)).toEqual([
      null,
      null,
    ]);
  });

  it("names nothing when the response is not what Overpass sends", async () => {
    expect(await lookupClimbNames([summit], malformed)).toEqual([null]);
  });

  it("skips the request when there is nothing to name", async () => {
    expect(await lookupClimbNames([], unreachable)).toEqual([]);
  });
});

describe("elevationOf", () => {
  test.each<{ name: string; ele: string | undefined; metres: number }>([
    { name: "bare metres", ele: "2024.79", metres: 2024.79 },
    { name: "metres with a unit", ele: "1173 m", metres: 1173 },
    { name: "feet", ele: "2000 ft", metres: 609.6 },
    { name: "feet with a prime", ele: "2000'", metres: 609.6 },
    { name: "missing", ele: undefined, metres: Number.NEGATIVE_INFINITY },
    { name: "unparsable", ele: "about 900", metres: Number.NEGATIVE_INFINITY },
  ])("$name", ({ ele, metres }) => {
    expect(elevationOf(ele)).toBeCloseTo(metres);
  });
});

describe("overpassQuery", () => {
  // Without a declared maxsize Overpass reserves 512 MiB per query, and a
  // busy server answers 504 rather than find that much.
  it("declares a memory budget a busy server can admit", () => {
    expect(overpassQuery([[37.88, -121.91]])).toMatch(
      /^\[out:json\]\[timeout:8\]\[maxsize:33554432\];/,
    );
  });
});
