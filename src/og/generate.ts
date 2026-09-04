import { type CollectionEntry } from "astro:content";
import { svgToPng } from "@/raster";
import activityOgImage from "./templates/activity";
import postOgImage from "./templates/post";
import siteOgImage from "./templates/site";

export async function generateOgImageForPost(post: CollectionEntry<"blog">) {
  const svg = await postOgImage(post);
  return svgToPng(svg);
}

export async function generateOgImageForSite() {
  const svg = await siteOgImage();
  return svgToPng(svg);
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
  return svgToPng(svg);
}
