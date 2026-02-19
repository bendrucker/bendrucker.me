import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { getPlatformProxy } from "wrangler";
import { createDb } from "../src/db";
import type { CompiledQuery } from "kysely";

export async function connectD1() {
  const { env, dispose } = await getPlatformProxy<{
    ACTIVITY_DB: D1Database;
  }>();
  const db = createDb(env.ACTIVITY_DB);
  return { db, dispose };
}

export function formatSql(compiled: CompiledQuery): string {
  let i = 0;
  return compiled.sql.replace(/\?/g, () => {
    const val = compiled.parameters[i++];
    if (val === null || val === undefined) return "NULL";
    if (typeof val === "number") return String(val);
    if (typeof val === "boolean") return val ? "1" : "0";
    return `'${String(val).replace(/'/g, "''")}'`;
  });
}

export function executeRemote(statements: string[]) {
  const sqlFile = join(process.cwd(), "tmp", "d1-import.sql");
  writeFileSync(sqlFile, statements.join("\n") + "\n");
  execSync(
    `wrangler d1 execute bendrucker-activity --remote --file=${sqlFile}`,
    { encoding: "utf-8" },
  );
}
