import { Resvg, initWasm } from "@resvg/resvg-wasm";
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
import { type CollectionEntry } from "astro:content";
import activityOgImage from "./templates/activity";
import postOgImage from "./templates/post";
import siteOgImage from "./templates/site";

let wasmInitialized = false;

async function svgBufferToPngBuffer(svg: string) {
  if (!wasmInitialized) {
    await initWasm(fetch(wasmUrl));
    wasmInitialized = true;
  }
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  return new Uint8Array(pngData.asPng());
}

export async function generateOgImageForPost(post: CollectionEntry<"blog">) {
  const svg = await postOgImage(post);
  return await svgBufferToPngBuffer(svg);
}

export async function generateOgImageForSite() {
  const svg = await siteOgImage();
  return await svgBufferToPngBuffer(svg);
}

export interface ActivityOgStats {
  repos: number;
  prs: number;
  reviews: number;
  issues: number;
  years: number;
  languages: Array<{ name: string; color: string; count: number }>;
}

export async function generateOgImageForActivity(stats: ActivityOgStats) {
  const svg = await activityOgImage(stats);
  return await svgBufferToPngBuffer(svg);
}
