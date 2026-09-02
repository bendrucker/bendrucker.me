import { execSync } from "child_process";
import { logger } from "@workspace/logger";
import { writeFileSync } from "fs";
import { join } from "path";
import { getPlatformProxy } from "wrangler";
import type { RepoActivity } from "@workspace/github";
import { d1Store } from "../src/activity/store";
import { syncActivity, syncStatements } from "../src/activity/sync";
import type { CompiledQuery } from "kysely";
import SQLite from "better-sqlite3";

export async function connectD1() {
  const { env, dispose } = await getPlatformProxy<{
    ACTIVITY_DB: D1Database;
  }>();
  return { store: d1Store(env.ACTIVITY_DB), dispose };
}

const quote = new SQLite(":memory:").prepare("SELECT quote(?)").pluck();

export function formatSql(compiled: CompiledQuery): string {
  let i = 0;
  const sql = compiled.sql.replace(/\?/g, () =>
    String(quote.get(compiled.parameters[i++])),
  );
  return `${sql};`;
}

export function executeRemote(statements: string[]) {
  const sqlFile = join(process.cwd(), "tmp", "d1-import.sql");
  writeFileSync(sqlFile, `${statements.join("\n")}\n`);
  execSync(
    `wrangler d1 execute bendrucker-activity --remote --file=${sqlFile}`,
    { encoding: "utf-8" },
  );
}

/**
 * The write both scripts perform. Neither covers the window the hourly cron
 * fetches, so both clear the payload hash and leave the next cron to establish
 * one over its own dataset.
 */
export async function importActivity(
  repos: RepoActivity[],
  remote: boolean,
): Promise<void> {
  const { store, dispose } = await connectD1();
  try {
    if (remote) {
      const statements = syncStatements(store.db, repos);
      executeRemote(statements.map((statement) => formatSql(statement)));
      logger.info(
        { statements: statements.length, remote },
        "Imported activity data to D1",
      );
      return;
    }

    const result = await syncActivity(store, repos, { recordHash: false });
    logger.info({ ...result, remote }, "Imported activity data to D1");
  } finally {
    await dispose();
  }
}
