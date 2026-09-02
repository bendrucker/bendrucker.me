#!/usr/bin/env tsx

import { createRequire } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { logger } from "@workspace/logger";
import { connectD1, formatSql, executeRemote } from "./d1";
import { upsertLanguageExtension } from "../src/activity/upsert";

const require = createRequire(import.meta.url);
const pkgDir = join(require.resolve("linguist-languages"), "..");
const dataDir = join(pkgDir, "data");

// Each data file is evaluated rather than imported, so what comes back is
// whatever the expression built. Only `name` is guaranteed across all of them.
const language = z.object({
  name: z.string(),
  type: z.string().optional(),
  extensions: z.array(z.string()).default([]),
});

const map: Record<string, string> = {};

for (const file of readdirSync(dataDir)) {
  if (!file.endsWith(".js")) continue;
  const raw = readFileSync(join(dataDir, file), "utf-8");
  const match = raw.match(/export default ({[\s\S]*})/);
  if (!match) continue;
  const data = language.parse(new Function(`return ${match[1]}`)());
  if (data.type === "programming" && data.extensions.length) {
    map[data.name] = data.extensions[0];
  }
}

const entries = Object.entries(map);
const remote = process.argv.includes("--remote");

async function main() {
  const { store, dispose } = await connectD1();
  try {
    if (remote) {
      const statements = entries.map(([name, ext]) =>
        formatSql(upsertLanguageExtension(store.db, name, ext).compile()),
      );
      executeRemote(statements);
    } else {
      for (const [name, ext] of entries) {
        await upsertLanguageExtension(store.db, name, ext).execute();
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
