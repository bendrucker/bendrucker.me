import { Resvg } from "@cf-wasm/resvg/workerd";

/**
 * The worker's only image encoder. Both the OG images and the route basemaps
 * are assembled as SVG and come through here, so a change to how resvg is
 * configured reaches all of them.
 */
export function svgToPng(svg: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new Resvg(svg).render().asPng());
}
