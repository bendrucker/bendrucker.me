// Kysely's D1 dialect throws on transactions, so a multi-statement write goes
// through d1.batch() instead. Naming that as its own operation is what lets a
// test run the same statements against SQLite.
import type { CompiledQuery, Kysely } from "kysely";
import { createDb, type Database } from "../db";

export interface ActivityStore {
  db: Kysely<Database>;
  /**
   * Runs the statements together and reports the rows they changed. The sync
   * reads that count: every upsert is guarded, so a batch that matches what is
   * already stored changes nothing and leaves the version alone.
   */
  batch(statements: readonly CompiledQuery[]): Promise<number>;
}

export function d1Store(d1: D1Database): ActivityStore {
  return {
    db: createDb(d1),
    batch: async (statements) => {
      const results = await d1.batch(
        statements.map((statement) =>
          d1.prepare(statement.sql).bind(...statement.parameters),
        ),
      );
      return results.reduce((total, result) => total + result.meta.changes, 0);
    },
  };
}
