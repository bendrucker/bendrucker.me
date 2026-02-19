import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { getPlatformProxy } from "wrangler";
import { createDb } from "../src/db";
import type { CompiledQuery } from "kysely";
import SQLite from "better-sqlite3";

export async function connectD1() {
  const { env, dispose } = await getPlatformProxy<{
    ACTIVITY_DB: D1Database;
  }>();
  const db = createDb(env.ACTIVITY_DB);
  return { db, dispose };
}

const quote = new SQLite(":memory:").prepare("SELECT quote(?)").pluck();

export function formatSql(compiled: CompiledQuery): string {
  let i = 0;
  return compiled.sql.replace(/\?/g, () =>
    String(quote.get(compiled.parameters[i++])),
  );
}

export function executeRemote(statements: string[]) {
  const sqlFile = join(process.cwd(), "tmp", "d1-import.sql");
  writeFileSync(sqlFile, statements.join("\n") + "\n");
  execSync(
    `wrangler d1 execute bendrucker-activity --remote --file=${sqlFile}`,
    { encoding: "utf-8" },
  );
}
