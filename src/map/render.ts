import { Resvg } from "@cf-wasm/resvg/workerd";
import { basemapSvg, type BasemapRequest } from "./svg";

export async function renderBasemap(
  request: BasemapRequest,
): Promise<Uint8Array<ArrayBuffer>> {
  const svg = await basemapSvg(request);
  return new Uint8Array(new Resvg(svg).render().asPng());
}
