#!/usr/bin/env tsx

// Worker Previews with a D1 database per preview, since a D1 binding is shared
// unless it names a different database.
//
//   npm run preview -- deploy [--name X]   build and preview this branch
//   npm run preview -- prepare --name X    create, seed, and migrate its database
//   npm run preview -- config --name X     point the built config at its database
//   npm run preview -- delete [--name X]   remove its previews and database
//   npm run preview -- sweep [--dry-run]   remove what closed PRs left behind
//
// The name defaults to the current branch.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { logger } from "@workspace/logger";
import { experimental_readRawConfig } from "wrangler";
import { z } from "zod";

const PRODUCTION = "bendrucker-activity";
const DATABASE_PREFIX = `${PRODUCTION}-`;
const WORKERS = ["bendrucker-me", "bendrucker-me-stories"];
const BINDING = "ACTIVITY_DB";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONFIG = path.join(ROOT, "wrangler.toml");
const MIGRATE_CONFIG = path.join(ROOT, "wrangler.preview.json");
const BUILT_CONFIG = path.join(ROOT, "dist", "server", "wrangler.json");
const DUMP = path.join(ROOT, "tmp", "preview-seed.sql");
const WRANGLER = path.join(ROOT, "node_modules", ".bin", "wrangler");

/** A deploy job that started before the close can still be writing. */
const CLOSED_GRACE_MS = 2 * 60 * 60 * 1000;

const database = z.object({ uuid: z.string(), name: z.string() });
type Database = z.infer<typeof database>;

const databases = z.array(database);

/** What `wrangler d1 execute --json` prints: one entry per statement. */
const tableNames = z
  .tuple([z.object({ results: z.array(z.object({ name: z.string() })) })])
  .rest(z.unknown());

const pullRequest = z.object({
  number: z.number(),
  state: z.enum(["OPEN", "CLOSED", "MERGED"]),
  headRefName: z.string(),
  closedAt: z.string().nullable(),
});
type PullRequest = z.infer<typeof pullRequest>;

const pullRequests = z.array(pullRequest);

const d1Binding = z.looseObject({ binding: z.string() });

const rawConfig = z.looseObject({
  d1_databases: z.array(d1Binding),
  previews: z.looseObject({
    d1_databases: z.array(d1Binding).optional(),
  }),
});

function main(): void {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      name: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  const [command = "deploy"] = positionals;
  // Resolved per command: a sweep runs from a detached checkout with no branch.
  const name = (): string => values.name ?? branchName();

  switch (command) {
    case "deploy": {
      const target = name();
      prepare(target);
      run("npm", ["run", "build"]);
      run("cp", [".assetsignore", "dist/"]);
      patchBuiltConfig(target);
      return run(WRANGLER, ["preview", "--name", target]);
    }
    case "prepare":
      return prepare(name());
    case "config":
      return patchBuiltConfig(name());
    case "delete":
      return remove(name());
    case "sweep":
      return sweep(values["dry-run"]);
    default:
      throw new Error(
        `Unknown command "${command}". Expected deploy, prepare, config, delete, or sweep.`,
      );
  }
}

function prepare(name: string): void {
  const target = databaseName(name);
  const db = find(target) ?? create(target);
  if (!tables(target).includes("activity_feed")) {
    seed(target);
  }
  writeConfig(
    MIGRATE_CONFIG,
    experimental_readRawConfig({ config: CONFIG }).rawConfig,
    db,
  );
  run(WRANGLER, [
    "d1",
    "migrations",
    "apply",
    target,
    "--remote",
    "--config",
    MIGRATE_CONFIG,
  ]);
}

function create(target: string): Database {
  run(WRANGLER, ["d1", "create", target]);
  const db = find(target);
  if (db === undefined) {
    throw new Error(`Created ${target} but it is missing from d1 list.`);
  }
  return db;
}

/** The dump carries `d1_migrations`, so `apply` adds only the branch's own. */
function seed(target: string): void {
  const source = tables(PRODUCTION);
  mkdirSync(path.dirname(DUMP), { recursive: true });
  run(WRANGLER, [
    "d1",
    "export",
    PRODUCTION,
    "--remote",
    "--skip-confirmation",
    "--output",
    DUMP,
    ...source.flatMap((table) => ["--table", table]),
  ]);
  run(WRANGLER, ["d1", "execute", target, "--remote", "--yes", "--file", DUMP]);
  logger.info({ target, tables: source }, "Seeded from production");
}

/** The Vite plugin redirects wrangler here, so the preview binds what this says. */
function patchBuiltConfig(name: string): void {
  const target = databaseName(name);
  const db = find(target);
  if (db === undefined) {
    throw new Error(`Database ${target} does not exist. Run prepare first.`);
  }
  writeConfig(
    BUILT_CONFIG,
    JSON.parse(readFileSync(BUILT_CONFIG, "utf-8")),
    db,
  );
}

function writeConfig(file: string, input: unknown, db: Database): void {
  writeFileSync(
    file,
    `${JSON.stringify(withPreviewDatabase(input, db), null, 2)}\n`,
  );
}

function withPreviewDatabase(input: unknown, db: Database): object {
  const config = rawConfig.parse(input);
  const activity = config.d1_databases.find((d) => d.binding === BINDING);
  if (activity === undefined) {
    throw new Error(`The config has no ${BINDING} database binding.`);
  }
  const binding = {
    ...activity,
    database_name: db.name,
    database_id: db.uuid,
  };
  logger.info({ database: db.name }, "Bound the preview database");
  return {
    ...config,
    d1_databases: [
      ...config.d1_databases.filter((d) => d.binding !== BINDING),
      binding,
    ],
    previews: {
      ...config.previews,
      d1_databases: [...(config.previews.d1_databases ?? []), binding],
    },
  };
}

/** Previews first: a failed delete then leaves the database for the sweeper. */
function remove(name: string, db = find(databaseName(name))): void {
  for (const worker of WORKERS) {
    deletePreview(worker, name);
  }
  if (db !== undefined) {
    run(WRANGLER, ["d1", "delete", db.name, "--skip-confirmation"]);
  }
  logger.info({ name }, "Deleted preview resources");
}

/** A preview with no pull request is left alone: nothing says it is idle. */
function sweep(dryRun: boolean): void {
  const now = Date.now();
  const byName = pullRequestsByPreviewName();
  const candidates = list().filter((db) => db.name.startsWith(DATABASE_PREFIX));
  let swept = 0;

  for (const db of candidates) {
    const name = db.name.slice(DATABASE_PREFIX.length);
    const prs = byName.get(name);
    if (prs === undefined || !prs.every((pr) => closedFor(pr, now))) continue;

    logger.info(
      { name, pullRequests: prs.map((pr) => pr.number), dryRun },
      "Sweeping preview resources",
    );
    if (!dryRun) remove(name, db);
    swept += 1;
  }

  logger.info(
    { candidates: candidates.length, swept, dryRun },
    "Sweep complete",
  );
}

function closedFor(pr: PullRequest, now: number): boolean {
  return (
    pr.state !== "OPEN" &&
    pr.closedAt !== null &&
    now - Date.parse(pr.closedAt) > CLOSED_GRACE_MS
  );
}

/** Every pull request, under both names a preview of it can carry. */
function pullRequestsByPreviewName(): Map<string, PullRequest[]> {
  const stdout = execFileSync(
    "gh",
    [
      "pr",
      "list",
      "--state",
      "all",
      "--limit",
      "5000",
      "--json",
      "number,state,headRefName,closedAt",
    ],
    { encoding: "utf-8" },
  );
  const byName = new Map<string, PullRequest[]>();
  for (const pr of pullRequests.parse(JSON.parse(stdout))) {
    for (const name of [`pr-${pr.number}`, slug(pr.headRefName)]) {
      byName.set(name, [...(byName.get(name) ?? []), pr]);
    }
  }
  return byName;
}

function deletePreview(worker: string, name: string): void {
  const result = spawnSync(
    WRANGLER,
    [
      "preview",
      "delete",
      "--worker-name",
      worker,
      "--name",
      name,
      "--skip-confirmation",
    ],
    { encoding: "utf-8" },
  );
  if (result.status === 0) return;

  const output = `${result.stdout}${result.stderr}`;
  if (/Preview not found|code: 10025/.test(output)) {
    logger.info({ worker, name }, "No preview to delete");
    return;
  }
  throw new Error(`wrangler preview delete failed for ${worker}:\n${output}`);
}

function list(): Database[] {
  const stdout = execFileSync(WRANGLER, ["d1", "list", "--json"], {
    encoding: "utf-8",
  });
  return databases.parse(JSON.parse(stdout));
}

function find(target: string): Database | undefined {
  return list().find((db) => db.name === target);
}

/** Every table but D1's own `_cf_*` ones, which a new database already has. */
function tables(target: string): string[] {
  const stdout = execFileSync(
    WRANGLER,
    [
      "d1",
      "execute",
      target,
      "--remote",
      "--json",
      "--command",
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and substr(name, 1, 4) <> '_cf_' order by name",
    ],
    { encoding: "utf-8" },
  );
  const [first] = tableNames.parse(JSON.parse(stdout));
  return first.results.map((row) => row.name);
}

function databaseName(name: string): string {
  return `${DATABASE_PREFIX}${name}`;
}

function branchName(): string {
  const branch = execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf-8",
  }).trim();
  const name = slug(branch);
  if (name === "") {
    throw new Error("Not on a branch. Pass --name.");
  }
  return name;
}

function slug(branch: string): string {
  return branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function run(command: string, args: string[]): void {
  execFileSync(command, args, { cwd: ROOT, stdio: "inherit" });
}

main();
