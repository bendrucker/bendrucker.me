#!/usr/bin/env tsx

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Resvg } from "@cf-wasm/resvg/node";
import opentype from "opentype.js";
import pngToIco from "png-to-ico";
import { logger } from "@workspace/logger";
import { loadGoogleFont } from "../src/og/fonts";

const LETTERS = "BD";
const FONT = { family: "IBM+Plex+Mono", weight: 700 };
const INK = { light: "#282728", dark: "#eaedf3" };
const TILE_BG = "#fdfdfd";

const CANVAS = 128;
// The D's open right side reads left of true center, so nudge the mark right.
const OPTICAL_NUDGE = 3;
// Fraction of the canvas width the mark spans. The tab favicon fills the frame;
// the home-screen tile leaves room for iOS's rounded-corner mask.
const FAVICON_FILL = 0.9;
const APPLE_FILL = 0.62;

const ICO_SIZES = [16, 32, 48];
const APPLE_SIZE = 180;

const STATIC = join(dirname(fileURLToPath(import.meta.url)), "..", "static");

interface Placement {
  d: string;
  transform: string;
}

// Outline the letters at a nominal 100px em, then compute a group transform that
// scales the mark to the target fill and centers it (cap-height vertically,
// bounding-box horizontally with the optical nudge).
function place(font: opentype.Font, fill: number): Placement {
  const path = font.getPath(LETTERS, 0, 0, 100);
  const { x1, y1, x2, y2 } = path.getBoundingBox();
  const scale = (fill * CANVAS) / (x2 - x1);
  const tx = CANVAS / 2 + OPTICAL_NUDGE - ((x1 + x2) / 2) * scale;
  const ty = CANVAS / 2 - ((y1 + y2) / 2) * scale;
  return {
    d: path.toPathData(2),
    transform: `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})`,
  };
}

function faviconSvg({ d, transform }: Placement): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}"><style>path{fill:${INK.light}}@media(prefers-color-scheme:dark){path{fill:${INK.dark}}}</style><g transform="${transform}"><path d="${d}"/></g></svg>\n`;
}

function inkSvg(
  { d, transform }: Placement,
  fill: string,
  background?: string,
): string {
  const tile = background
    ? `<rect width="${CANVAS}" height="${CANVAS}" fill="${background}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}">${tile}<g transform="${transform}"><path d="${d}" fill="${fill}"/></g></svg>`;
}

// Resvg.async resolves once the wasm module is ready, so rasterizing never
// depends on some earlier await having already warmed it up.
async function rasterize(
  svg: string,
  size: number,
  background?: string,
): Promise<Buffer> {
  const resvg = await Resvg.async(svg, {
    fitTo: { mode: "width", value: size },
    ...(background ? { background } : {}),
  });
  return Buffer.from(resvg.render().asPng());
}

async function main() {
  logger.info(`Loading ${FONT.family} @ ${FONT.weight}`);
  const font = opentype.parse(
    await loadGoogleFont(FONT.family, LETTERS, FONT.weight),
  );

  const favicon = place(font, FAVICON_FILL);
  writeFileSync(join(STATIC, "favicon.svg"), faviconSvg(favicon));
  logger.info("Wrote favicon.svg");

  // Safari ignores prefers-color-scheme inside a favicon, so favicon-theme.js
  // swaps to this explicit light-ink variant when the OS switches to dark.
  writeFileSync(
    join(STATIC, "favicon-dark.svg"),
    inkSvg(favicon, INK.dark) + "\n",
  );
  logger.info("Wrote favicon-dark.svg");

  const frames = await Promise.all(
    ICO_SIZES.map((size) => rasterize(inkSvg(favicon, INK.light), size)),
  );
  writeFileSync(join(STATIC, "favicon.ico"), await pngToIco(frames));
  logger.info(`Wrote favicon.ico (${ICO_SIZES.join("/")})`);

  const tile = inkSvg(place(font, APPLE_FILL), INK.light, TILE_BG);
  writeFileSync(
    join(STATIC, "apple-touch-icon.png"),
    await rasterize(tile, APPLE_SIZE, TILE_BG),
  );
  logger.info(`Wrote apple-touch-icon.png (${APPLE_SIZE}px)`);
}

main().catch((err) => {
  logger.error({ err }, "Failed to generate favicons");
  process.exitCode = 1;
});
