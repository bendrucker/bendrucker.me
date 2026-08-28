import { sql, type CompiledQuery, type Kysely } from "kysely";
import type { Database } from "../db";
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
      oc
        .columns(["owner", "name"])
        .doUpdateSet((eb) => ({
          description: eb.ref("excluded.description"),
          url: eb.ref("excluded.url"),
          primaryLanguageName: eb.ref("excluded.primaryLanguageName"),
          primaryLanguageColor: eb.ref("excluded.primaryLanguageColor"),
          stargazerCount: eb.ref("excluded.stargazerCount"),
          updatedAt: sql`datetime('now')`,
        }))
        // D1 bills a rewritten row even when every value is identical, and the
        // hourly cron re-sends the same payload for most repos. `is not` rather
        // than `!=` so a nullable column going to or from NULL still counts.
        .where((eb) =>
          eb.or([
            eb("repos.description", "is not", eb.ref("excluded.description")),
            eb("repos.url", "is not", eb.ref("excluded.url")),
            eb(
              "repos.primaryLanguageName",
              "is not",
              eb.ref("excluded.primaryLanguageName"),
            ),
            eb(
              "repos.primaryLanguageColor",
              "is not",
              eb.ref("excluded.primaryLanguageColor"),
            ),
            eb(
              "repos.stargazerCount",
              "is not",
              eb.ref("excluded.stargazerCount"),
            ),
          ]),
        ),
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
      oc
        .columns(["repoId", "year"])
        .doUpdateSet((eb) => ({
          prCount: eb.ref("excluded.prCount"),
          reviewCount: eb.ref("excluded.reviewCount"),
          issueCount: eb.ref("excluded.issueCount"),
          mergeCount: eb.ref("excluded.mergeCount"),
          hasMergedPrs: eb.ref("excluded.hasMergedPrs"),
          lastActivity: eb.ref("excluded.lastActivity"),
        }))
        .where((eb) =>
          eb.or([
            eb("repoActivity.prCount", "is not", eb.ref("excluded.prCount")),
            eb(
              "repoActivity.reviewCount",
              "is not",
              eb.ref("excluded.reviewCount"),
            ),
            eb(
              "repoActivity.issueCount",
              "is not",
              eb.ref("excluded.issueCount"),
            ),
            eb(
              "repoActivity.mergeCount",
              "is not",
              eb.ref("excluded.mergeCount"),
            ),
            eb(
              "repoActivity.hasMergedPrs",
              "is not",
              eb.ref("excluded.hasMergedPrs"),
            ),
            eb(
              "repoActivity.lastActivity",
              "is not",
              eb.ref("excluded.lastActivity"),
            ),
          ]),
        ),
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
        .doUpdateSet((eb) => ({ extension: eb.ref("excluded.extension") }))
        .where((eb) =>
          eb(
            "languageExtensions.extension",
            "is not",
            eb.ref("excluded.extension"),
          ),
        ),
    );
}

/**
 * Every statement a fetch translates to, sorted so that two fetches carrying
 * the same data compile identically no matter what order GitHub returned the
 * repos in. `hashStatements` reads that as "nothing to write".
 */
export function activityStatements(
  db: Kysely<Database>,
  repos: RepoActivity[],
): CompiledQuery[] {
  return repos
    .toSorted(
      (a, b) => a.owner.localeCompare(b.owner) || a.name.localeCompare(b.name),
    )
    .flatMap((repo) => [
      upsertRepo(db, repo).compile(),
      upsertActivity(db, repo).compile(),
    ]);
}
