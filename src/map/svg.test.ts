import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Coordinate } from "@/activity/types";
import { basemapSvg } from "./svg";
import { fetchTile, type DecodedFeature, type DecodedTile } from "./tiles";

vi.mock("./tiles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./tiles")>()),
  fetchTile: vi.fn(),
}));

const WIDTH = 150;
const HEIGHT = 140;

// Far enough apart to need more than one tile, which is what makes the
// ordering between tiles observable.
const ROUTE: Coordinate[] = [
  [37.74, -122.46],
  [37.81, -122.39],
];

function polygon(featureClass?: string): DecodedFeature {
  return {
    ...(featureClass === undefined ? {} : { class: featureClass }),
    type: 3,
    rings: [
      [
        { x: 0, y: 0 },
        { x: 4096, y: 0 },
        { x: 4096, y: 4096 },
      ],
    ],
  };
}

function line(featureClass: string): DecodedFeature {
  return {
    class: featureClass,
    type: 2,
    rings: [
      [
        { x: 0, y: 0 },
        { x: 4096, y: 4096 },
      ],
    ],
  };
}

function tileWith(layers: Record<string, DecodedFeature[]>): DecodedTile {
  return {
    layer: (name) => {
      const features = layers[name];
      return features === undefined ? undefined : { extent: 4096, features };
    },
  };
}

beforeEach(() => {
  vi.mocked(fetchTile).mockResolvedValue(
    tileWith({
      water: [polygon()],
      transportation: [line("motorway"), line("path")],
      landcover: [polygon("wood")],
    }),
  );
});

async function render(scale: 1 | 2 = 1) {
  return basemapSvg({
    coordinates: ROUTE,
    width: WIDTH,
    height: HEIGHT,
    theme: "light",
    scale,
  });
}

describe("basemapSvg", () => {
  // The assertions below each pin one property of the markup. This pins the
  // markup, so a change to its shape has to be read in a diff rather than
  // slipping through the gaps between them.
  it("assembles the whole document", async () => {
    expect(await render()).toMatchSnapshot();
  });

  it("rasterizes at the requested scale, framed in card pixels", async () => {
    const oneX = await render(1);
    expect(oneX).toContain(`width="${WIDTH}" height="${HEIGHT}"`);
    expect(oneX).toContain(`viewBox="0 0 ${WIDTH} ${HEIGHT}"`);

    const twoX = await render(2);
    expect(twoX).toContain(`width="${WIDTH * 2}" height="${HEIGHT * 2}"`);
    expect(twoX).toContain(`viewBox="0 0 ${WIDTH} ${HEIGHT}"`);
  });

  // The regression this whole feature is one typo away from: the 1x and 2x
  // renders must show the same map, at the same zoom and framing, differing
  // only in how large the root element says it is.
  it("draws the same map at every scale", async () => {
    const oneX = await render(1);
    const twoX = await render(2);
    expect(twoX).toBe(
      oneX.replace(
        `width="${WIDTH}" height="${HEIGHT}" viewBox`,
        `width="${WIDTH * 2}" height="${HEIGHT * 2}" viewBox`,
      ),
    );
  });

  it("fills the card before anything is drawn on it", async () => {
    const svg = await render();
    expect(svg.indexOf("<rect")).toBeLessThan(svg.indexOf("<g "));
  });

  // Every tile of a layer is drawn in one pass. Grouping by tile instead would
  // let a tile's water land on the roads its neighbour already drew.
  it("draws each layer across all tiles before the next layer", async () => {
    const svg = await render();
    const groups = svg.match(/<g [^>]*>/g) ?? [];
    const paths = svg.match(/<path /g) ?? [];
    expect(groups.length).toBeLessThan(paths.length);
  });

  it("draws fills beneath lines", async () => {
    const svg = await render();
    expect(svg.indexOf('fill-rule="evenodd"')).toBeLessThan(
      svg.indexOf('fill="none"'),
    );
  });

  it("clips every tile to its own box", async () => {
    const svg = await render();
    const clips = new Set(svg.match(/clip-path="url\(#t\d+\)"/g));
    const defs = new Set(svg.match(/<clipPath id="t\d+">/g));
    expect(clips.size).toBe(defs.size);
    expect(defs.size).toBeGreaterThan(1);
  });

  it("keeps a layer's classes apart", async () => {
    vi.mocked(fetchTile).mockResolvedValue(
      tileWith({ transportation: [line("motorway")] }),
    );
    const motorwayOnly = await render();

    vi.mocked(fetchTile).mockResolvedValue(
      tileWith({ transportation: [line("path")] }),
    );
    const pathOnly = await render();

    expect(motorwayOnly).not.toBe(pathOnly);
  });

  it("omits a layer the tiles do not carry", async () => {
    vi.mocked(fetchTile).mockResolvedValue(tileWith({}));
    expect(await render()).not.toContain("<g ");
  });

  // A tile can 404 at the edge of coverage, and the card still has to render.
  it("renders without a tile that failed to load", async () => {
    vi.mocked(fetchTile).mockResolvedValue(null);
    expect(await render()).toContain("<svg");
  });
});
