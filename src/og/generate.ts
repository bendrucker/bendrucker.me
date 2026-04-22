import { Resvg } from "@cf-wasm/resvg/workerd";
import { type CollectionEntry } from "astro:content";
import activityOgImage from "./templates/activity";
import postOgImage from "./templates/post";
import siteOgImage from "./templates/site";

function svgBufferToPngBuffer(svg: string) {
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  return new Uint8Array(pngData.asPng());
}

export async function generateOgImageForPost(post: CollectionEntry<"blog">) {
  const svg = await postOgImage(post);
  return svgBufferToPngBuffer(svg);
}

export async function generateOgImageForSite() {
  const svg = await siteOgImage();
  return svgBufferToPngBuffer(svg);
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
  return svgBufferToPngBuffer(svg);
}
