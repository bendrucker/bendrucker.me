#!/usr/bin/env tsx

import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { logger } from "@workspace/logger";
import { connectD1, formatSql, executeRemote } from "./d1";
import { upsertLanguageExtension } from "./upsert";

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

const entries = Object.entries(map);
const remote = process.argv.includes("--remote");

async function main() {
  const { db, dispose } = await connectD1();
  try {
    if (remote) {
      const statements = entries.map(([name, ext]) =>
        formatSql(upsertLanguageExtension(db, name, ext).compile()),
      );
      executeRemote(statements);
    } else {
      for (const [name, ext] of entries) {
        await upsertLanguageExtension(db, name, ext).execute();
      }
    }
  } finally {
    await dispose();
  }

  logger.info(
    { count: entries.length, remote },
    "Seeded language_extensions table",
  );
}

main().catch((error) => {
  logger.error(
    { error: error instanceof Error ? error.message : error },
    "Failed to seed language_extensions",
  );
  process.exit(1);
});
