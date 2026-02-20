import {
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type DatabaseIntrospector,
  type Dialect,
  type Driver,
  type Kysely,
  type QueryCompiler,
  type QueryResult,
} from "kysely";

interface D1DialectConfig {
  database: D1Database;
}

class D1Connection implements DatabaseConnection {
  #database: D1Database;

  constructor(database: D1Database) {
    this.#database = database;
  }

  async executeQuery<R>(compiledQuery: CompiledQuery): Promise<QueryResult<R>> {
    const results = await this.#database
      .prepare(compiledQuery.sql)
      .bind(...compiledQuery.parameters)
      .all();

    if (results.error) {
      throw new Error(results.error);
    }

    return {
      insertId:
        results.meta.last_row_id == null
          ? undefined
          : BigInt(results.meta.last_row_id),
      rows: (results?.results as R[]) || [],
      numAffectedRows:
        results.meta.changes > 0 ? BigInt(results.meta.changes) : undefined,
    };
  }

  async *streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
    throw new Error("D1 does not support streaming");
  }
}

class D1Driver implements Driver {
  #database: D1Database;

  constructor(database: D1Database) {
    this.#database = database;
  }

  async init(): Promise<void> {}

  async acquireConnection(): Promise<DatabaseConnection> {
    return new D1Connection(this.#database);
  }

  async beginTransaction(): Promise<never> {
    throw new Error("D1 does not support transactions");
  }

  async commitTransaction(): Promise<never> {
    throw new Error("D1 does not support transactions");
  }

  async rollbackTransaction(): Promise<never> {
    throw new Error("D1 does not support transactions");
  }

  async releaseConnection(): Promise<void> {}

  async destroy(): Promise<void> {}
}

export class D1Dialect implements Dialect {
  #config: D1DialectConfig;

  constructor(config: D1DialectConfig) {
    this.#config = config;
  }

  createAdapter() {
    return new SqliteAdapter();
  }

  createDriver(): Driver {
    return new D1Driver(this.#config.database);
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Dialect interface requires this signature
  createIntrospector(db: Kysely<any>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}
