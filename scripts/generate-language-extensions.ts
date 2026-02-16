#!/usr/bin/env tsx

import { createRequire } from "node:module";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { sql } from "./sql";
import { logger } from "@workspace/logger";

const require = createRequire(import.meta.url);
const pkgDir = join(require.resolve("linguist-languages"), "..");
const dataDir = join(pkgDir, "data");

const map: Record<string, string> = {};

for (const file of readdirSync(dataDir)) {
  if (!file.endsWith(".js")) continue;
  const raw = readFileSync(join(dataDir, file), "utf-8");
  const match = raw.match(/export default ({[\s\S]*})/);
  if (!match) continue;
  const data = new Function(`return ${match[1]}`)() as {
    name?: string;
    type?: string;
    extensions?: string[];
  };
  if (data.name && data.type === "programming" && data.extensions?.length) {
    map[data.name] = data.extensions[0];
  }
}

const statements = Object.entries(map).map(
  ([name, ext]) => sql`
INSERT INTO language_extensions (name, extension) VALUES (${name}, ${ext})
ON CONFLICT(name) DO UPDATE SET extension = excluded.extension;`,
);

const sqlFile = join(process.cwd(), "tmp", "language-extensions.sql");
writeFileSync(sqlFile, statements.join("\n") + "\n");

const remote = process.argv.includes("--remote");
const target = remote ? "--remote" : "--local";

try {
  execSync(
    `wrangler d1 execute bendrucker-activity ${target} --file=${sqlFile}`,
    { encoding: "utf-8" },
  );
  logger.info(
    { count: statements.length, remote },
    "Seeded language_extensions table",
  );
} catch (e) {
  logger.error(
    { error: e instanceof Error ? e.message : e },
    "Failed to seed language_extensions",
  );
  process.exit(1);
}
