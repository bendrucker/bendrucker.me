import type { APIRoute } from "astro";
import { generateOgImageForSite } from "@/og/generate";

export const GET: APIRoute = async () =>
  new Response(await generateOgImageForSite(), {
    headers: { "Content-Type": "image/png" },
  });
