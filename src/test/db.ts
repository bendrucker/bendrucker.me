import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import SQLite from "better-sqlite3";
import { CamelCasePlugin, Kysely, SqliteDialect } from "kysely";
import type { Database } from "@/db";

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, "../../migrations");

export function createTestDb(): Kysely<Database> {
  const sqlite = new SQLite(":memory:");

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    sqlite.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8"));
  }

  return new Kysely<Database>({
    dialect: new SqliteDialect({ database: sqlite }),
    plugins: [new CamelCasePlugin()],
  });
}

export interface SeedRepo {
  owner: string;
  name: string;
  description?: string;
  url?: string;
  primaryLanguageName?: string | null;
  primaryLanguageColor?: string | null;
  stargazerCount?: number;
  createdAt?: string | null;
  activity: Array<{
    lastActivity: number;
    prCount?: number;
    reviewCount?: number;
    issueCount?: number;
    mergeCount?: number;
    hasMergedPrs?: 0 | 1;
  }>;
}

export async function seed(
  db: Kysely<Database>,
  repos: SeedRepo[],
  languageExtensions: Array<{ name: string; extension: string }> = [],
): Promise<void> {
  for (const repo of repos) {
    const { id } = await db
      .insertInto("repos")
      .values({
        owner: repo.owner,
        name: repo.name,
        description: repo.description ?? "",
        url: repo.url ?? `https://github.com/${repo.owner}/${repo.name}`,
        primaryLanguageName: repo.primaryLanguageName ?? null,
        primaryLanguageColor: repo.primaryLanguageColor ?? null,
        stargazerCount: repo.stargazerCount ?? 0,
        createdAt: repo.createdAt ?? null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    for (const act of repo.activity) {
      await db
        .insertInto("repoActivity")
        .values({
          repoId: id,
          lastActivity: act.lastActivity,
          prCount: act.prCount ?? 0,
          reviewCount: act.reviewCount ?? 0,
          issueCount: act.issueCount ?? 0,
          mergeCount: act.mergeCount ?? 0,
          hasMergedPrs: act.hasMergedPrs ?? 0,
        })
        .execute();
    }
  }

  for (const ext of languageExtensions) {
    await db.insertInto("languageExtensions").values(ext).execute();
  }
}
