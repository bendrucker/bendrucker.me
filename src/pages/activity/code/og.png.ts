import type { APIRoute } from "astro";
import { sql } from "kysely";
import { getDb } from "@/db";
import { generateOgImageForActivity } from "@/utils/images/generate";

export const GET: APIRoute = async (context) => {
  const db = getDb(context.locals);

  const stats = await db
    .selectFrom("repos")
    .innerJoin("repoActivity", "repoActivity.repoId", "repos.id")
    .select([
      sql<number>`count(distinct ${sql.ref("repos.id")})`.as("repos"),
      sql<number>`coalesce(sum(${sql.ref("repoActivity.prCount")}), 0)`.as(
        "prs",
      ),
      sql<number>`coalesce(sum(${sql.ref("repoActivity.reviewCount")}), 0)`.as(
        "reviews",
      ),
      sql<number>`coalesce(sum(${sql.ref("repoActivity.issueCount")}), 0)`.as(
        "issues",
      ),
      sql<number>`count(distinct ${sql.ref("repoActivity.year")})`.as("years"),
    ])
    .executeTakeFirstOrThrow();

  const languages = await db
    .selectFrom("repos")
    .innerJoin("repoActivity", "repoActivity.repoId", "repos.id")
    .where("repos.primaryLanguageName", "is not", null)
    .select([
      "repos.primaryLanguageName as name",
      "repos.primaryLanguageColor as color",
      sql<number>`count(distinct ${sql.ref("repos.id")})`.as("count"),
    ])
    .groupBy("repos.primaryLanguageName")
    .orderBy(sql`count`, "desc")
    .limit(6)
    .execute();

  const png = await generateOgImageForActivity({
    repos: stats.repos,
    prs: stats.prs,
    reviews: stats.reviews,
    issues: stats.issues,
    years: stats.years,
    languages: languages.map((l) => ({
      name: l.name!,
      color: l.color!,
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
