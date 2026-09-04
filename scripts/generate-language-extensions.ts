#!/usr/bin/env tsx

import * as languages from "linguist-languages";
import type { Language } from "linguist-languages";
import { logger } from "@workspace/logger";
import { connectD1, formatSql, executeRemote } from "./d1";
import { upsertLanguageExtension } from "../src/activity/upsert";

// The package re-exports one module per language from its index. A language
// earns a row only if it is a programming language with a primary extension.
const map: Record<string, string> = {};

for (const language of Object.values<Language>(languages)) {
  const [extension] = language.extensions ?? [];
  if (language.type === "programming" && extension) {
    map[language.name] = extension;
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
