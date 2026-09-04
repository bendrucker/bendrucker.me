import { svgToPng } from "@/raster";
import { basemapSvg, type BasemapRequest } from "./svg";

export async function renderBasemap(
  request: BasemapRequest,
): Promise<Uint8Array<ArrayBuffer>> {
  return svgToPng(await basemapSvg(request));
}
