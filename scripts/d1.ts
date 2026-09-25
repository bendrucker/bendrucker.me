import { execFileSync } from "child_process";
import { logger } from "@workspace/logger";
import { writeFileSync } from "fs";
import { join } from "path";
import { getPlatformProxy } from "wrangler";
import type { RepoActivity } from "@workspace/github";
import { d1Store } from "../src/activity/store";
import { syncActivity, syncStatements } from "../src/activity/sync";
import type { CompiledQuery } from "kysely";
import SQLite from "better-sqlite3";
import { z } from "zod";

// The bindings a script reaches through the proxy. `env` comes back alongside
// the store because the seed writes ride photos into R2 as well as rows into
// D1, and two proxies would be two Miniflare instances over one state
// directory. Remote bindings stay off: `MEDIA` has no local simulator, so
// leaving them on opens a remote session that needs a login no script uses.
export async function connectD1() {
  const { env, dispose } = await getPlatformProxy<{
    ACTIVITY_DB: D1Database;
    RAW: R2Bucket;
  }>({ remoteBindings: false });
  return { store: d1Store(env.ACTIVITY_DB), env, dispose };
}

const quote = new SQLite(":memory:").prepare("SELECT quote(?)").pluck();

export function formatSql(compiled: CompiledQuery): string {
  let i = 0;
  const sql = compiled.sql.replace(/\?/g, () =>
    String(quote.get(compiled.parameters[i++])),
  );
  return `${sql};`;
}

const DATABASE = "bendrucker-activity";

/** Production, or the Miniflare state the dev servers and the seed share. */
export type D1Target = "remote" | "local";

export function executeD1(statements: string[], target: D1Target = "remote") {
  const sqlFile = join(process.cwd(), "tmp", "d1-import.sql");
  writeFileSync(sqlFile, `${statements.join("\n")}\n`);
  execFileSync(
    "wrangler",
    ["d1", "execute", DATABASE, `--${target}`, `--file=${sqlFile}`],
    { encoding: "utf-8" },
  );
}

/** What `wrangler d1 execute --json` prints: one entry per statement. */
const queryResult = z.array(z.object({ results: z.array(z.unknown()) })).min(1);

export function queryD1<T>(
  schema: z.ZodType<T>,
  sql: string,
  target: D1Target = "remote",
): T[] {
  const stdout = execFileSync(
    "wrangler",
    ["d1", "execute", DATABASE, `--${target}`, "--json", "--command", sql],
    { encoding: "utf-8" },
  );
  const [first] = queryResult.parse(JSON.parse(stdout));
  return first!.results.map((row) => schema.parse(row));
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
      executeD1(statements.map((statement) => formatSql(statement)));
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
