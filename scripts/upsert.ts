import { sql, type Kysely } from "kysely";
import type { Database } from "../src/db";
import type { RepoActivity } from "@workspace/github";

export function upsertRepo(db: Kysely<Database>, repo: RepoActivity) {
  return db
    .insertInto("repos")
    .values({
      owner: repo.owner,
      name: repo.name,
      description: repo.description,
      url: repo.url,
      primaryLanguageName: repo.primaryLanguage?.name ?? null,
      primaryLanguageColor: repo.primaryLanguage?.color ?? null,
      stargazerCount: repo.stargazerCount,
      createdAt: repo.createdAt ? new Date(repo.createdAt).toISOString() : null,
    })
    .onConflict((oc) =>
      oc.columns(["owner", "name"]).doUpdateSet((eb) => ({
        description: eb.ref("excluded.description"),
        url: eb.ref("excluded.url"),
        primaryLanguageName: eb.ref("excluded.primaryLanguageName"),
        primaryLanguageColor: eb.ref("excluded.primaryLanguageColor"),
        stargazerCount: eb.ref("excluded.stargazerCount"),
        updatedAt: sql`datetime('now')`,
      })),
    );
}

export function upsertActivity(db: Kysely<Database>, repo: RepoActivity) {
  const lastActivity = Math.floor(new Date(repo.lastActivity).getTime() / 1000);

  return db
    .insertInto("repoActivity")
    .values({
      repoId: db
        .selectFrom("repos")
        .select("id")
        .where("owner", "=", repo.owner)
        .where("name", "=", repo.name),
      prCount: repo.activitySummary.prCount,
      reviewCount: repo.activitySummary.reviewCount,
      issueCount: repo.activitySummary.issueCount,
      mergeCount: repo.activitySummary.mergeCount,
      hasMergedPrs: repo.activitySummary.hasMergedPRs ? 1 : 0,
      lastActivity,
    })
    .onConflict((oc) =>
      oc.columns(["repoId", "year"]).doUpdateSet((eb) => ({
        prCount: eb.ref("excluded.prCount"),
        reviewCount: eb.ref("excluded.reviewCount"),
        issueCount: eb.ref("excluded.issueCount"),
        mergeCount: eb.ref("excluded.mergeCount"),
        hasMergedPrs: eb.ref("excluded.hasMergedPrs"),
        lastActivity: eb.ref("excluded.lastActivity"),
      })),
    );
}

export function upsertLanguageExtension(
  db: Kysely<Database>,
  name: string,
  ext: string,
) {
  return db
    .insertInto("languageExtensions")
    .values({ name, extension: ext })
    .onConflict((oc) =>
      oc
        .column("name")
        .doUpdateSet((eb) => ({ extension: eb.ref("excluded.extension") })),
    );
}
