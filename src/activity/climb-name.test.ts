import { describe, it, expect } from "vitest";
import {
  lookupClimbNames,
  pickClimbName,
  type OverpassElement,
} from "./climb-name";
import type { Coordinate } from "./types";

const METRES_PER_DEGREE = 111_195;

/** A point `north` and `east` metres from `origin`. */
function offset(origin: Coordinate, north: number, east: number): Coordinate {
  return [
    origin[0] + north / METRES_PER_DEGREE,
    origin[1] +
      east / (METRES_PER_DEGREE * Math.cos((origin[0] * Math.PI) / 180)),
  ];
}

function peak(name: string, at: Coordinate): OverpassElement {
  return {
    type: "node",
    lat: at[0],
    lon: at[1],
    tags: { natural: "peak", name },
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
  it("names a climb after a peak and drops its directional suffix", () => {
    const elements = [
      peak("Mount Tamalpais West Peak", offset(summit, 367, 0)),
      roadPast(summit, "Ridgecrest Boulevard", "tertiary", 10),
    ];

    expect(pickClimbName(elements, summit)).toBe("Mount Tamalpais");
  });

  it("takes the road when the only peak stands too far away", () => {
    const elements = [
      peak("Ballou Point", offset(summit, 0, 1212)),
      roadPast(summit, "Tunitas Creek Road", "secondary", 20),
    ];

    expect(pickClimbName(elements, summit)).toBe("Tunitas Creek");
  });

  it("prefers a road to a nearer fire trail", () => {
    const elements = [
      roadPast(summit, "Cadd Dunlavy Fire Trail", "track", 5),
      roadPast(summit, "Pine Flat Road", "unclassified", 40),
    ];

    expect(pickClimbName(elements, summit)).toBe("Pine Flat");
  });

  it("ignores a road gathered for another summit", () => {
    const elements = [roadPast(summit, "Geysers Road", "unclassified", 500)];

    expect(pickClimbName(elements, summit)).toBeNull();
  });

  it("names nothing when OpenStreetMap has nothing nearby", () => {
    expect(pickClimbName([], summit)).toBeNull();
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
