import { execSync } from "child_process";
import { logger } from "@workspace/logger";
import { writeFileSync } from "fs";
import { join } from "path";
import { getPlatformProxy } from "wrangler";
import type { RepoActivity } from "@workspace/github";
import { fetchWork, fetchWorkByIds } from "../src/activity/github";
import { d1Store } from "../src/activity/store";
import { payloadWorkIds } from "../src/activity/work";
import { syncActivity, syncStatements } from "../src/activity/sync";
import type { CompiledQuery } from "kysely";
import SQLite from "better-sqlite3";

// The bindings a script reaches through the proxy. `env` comes back alongside
// the store because the seed writes ride photos into R2 as well as rows into
// D1, and two proxies would be two Miniflare instances over one state
// directory.
export async function connectD1() {
  const { env, dispose } = await getPlatformProxy<{
    ACTIVITY_DB: D1Database;
    RAW: R2Bucket;
  }>();
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
 *
 * Authored pull requests and issues are read by id first. Locally that skips
 * the ones stored merged or closed. A remote import cannot ask the remote
 * database, so it reads every one the payload names.
 */
export async function importActivity(
  repos: RepoActivity[],
  remote: boolean,
  token: string,
): Promise<void> {
  const { store, dispose } = await connectD1();
  try {
    if (remote) {
      const work = await fetchWorkByIds(token, payloadWorkIds(repos));
      const statements = syncStatements(store.db, repos, work);
      executeRemote(statements.map((statement) => formatSql(statement)));
      logger.info(
        {
          statements: statements.length,
          pullRequests: work.pullRequests.length,
          issues: work.issues.length,
          remote,
        },
        "Imported activity data to D1",
      );
      return;
    }

    const work = await fetchWork(token, store.db, repos);
    const result = await syncActivity(store, repos, {
      recordHash: false,
      work,
    });
    logger.info(
      {
        ...result,
        pullRequests: work.pullRequests.length,
        issues: work.issues.length,
        remote,
      },
      "Imported activity data to D1",
    );
  } finally {
    await dispose();
  }
}
