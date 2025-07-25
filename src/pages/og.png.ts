import type { APIRoute } from "astro";
import { generateOgImageForSite } from "@/utils/images/generate";

export const GET: APIRoute = async () =>
  new Response(await generateOgImageForSite(), {
    headers: { "Content-Type": "image/png" },
  });
