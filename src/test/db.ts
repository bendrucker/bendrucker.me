import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import SQLite from "better-sqlite3";
import { CamelCasePlugin, Kysely, SqliteDialect, sql } from "kysely";
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
    const owner = repo.owner;
    const name = repo.name;
    const description = repo.description ?? "";
    const url = repo.url ?? `https://github.com/${owner}/${name}`;
    const langName = repo.primaryLanguageName ?? null;
    const langColor = repo.primaryLanguageColor ?? null;
    const stars = repo.stargazerCount ?? 0;
    const createdAt = repo.createdAt ?? null;

    const { rows } = await sql<{ id: number }>`
      INSERT INTO repos (owner, name, description, url, primary_language_name, primary_language_color, stargazer_count, created_at)
      VALUES (${owner}, ${name}, ${description}, ${url}, ${langName}, ${langColor}, ${stars}, ${createdAt})
      RETURNING id
    `.execute(db);

    const repoId = rows[0].id;

    for (const act of repo.activity) {
      await sql`
        INSERT INTO repo_activity (repo_id, last_activity, pr_count, review_count, issue_count, merge_count, has_merged_prs)
        VALUES (${repoId}, ${act.lastActivity}, ${act.prCount ?? 0}, ${act.reviewCount ?? 0}, ${act.issueCount ?? 0}, ${act.mergeCount ?? 0}, ${act.hasMergedPrs ?? 0})
      `.execute(db);
    }
  }

  for (const ext of languageExtensions) {
    await sql`
      INSERT INTO language_extensions (name, extension) VALUES (${ext.name}, ${ext.extension})
    `.execute(db);
  }
}
