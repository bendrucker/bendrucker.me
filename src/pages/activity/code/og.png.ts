import type { APIRoute } from "astro";
import { getDb } from "@/db";
import { generateOgImageForActivity } from "@/og/generate";
import { queryActivityTotals, queryLanguages } from "@/activity/query";

export const GET: APIRoute = async () => {
  const db = await getDb();

  const totals = await queryActivityTotals(db);

  const { languages } = await queryLanguages(db, { limit: 6 });

  const png = await generateOgImageForActivity({
    repos: totals.repos,
    prs: totals.prs,
    reviews: totals.reviews,
    issues: totals.issues,
    years: totals.years,
    languages: languages.map((l) => ({
      name: l.name,
      color: l.color,
      count: l.count,
    })),
  });

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400",
    },
  });
};
