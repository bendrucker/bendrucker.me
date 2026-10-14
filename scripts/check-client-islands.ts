#!/usr/bin/env tsx

// Fails when the client build in `dist/` holds a chunk for a component whose
// categories are all off, which would publish it under `_astro/` for anyone
// to fetch. Run after `npm run build`.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { logger } from "@workspace/logger";
import { isOffCategoryIsland } from "../src/offCategoryIslands";

const env = {
  DEV: false,
  PUBLIC_ALL_CATEGORIES: process.env.PUBLIC_ALL_CATEGORIES,
};
const mediaDir = join(process.cwd(), "src", "components", "media");

const offIslands = readdirSync(mediaDir)
  .filter((file) => !file.endsWith(".story.vue"))
  .map((file) => join(mediaDir, file))
  .filter((file) => isOffCategoryIsland(file, env))
  .map((file) => file.slice(mediaDir.length + 1, -".vue".length));

const chunks = readdirSync(join(process.cwd(), "dist", "client", "_astro"));
const leaked = chunks.filter((chunk) =>
  offIslands.some((island) => chunk.startsWith(`${island}.`)),
);

if (leaked.length > 0) {
  logger.error({ leaked }, "Client chunks for categories that are off");
  process.exit(1);
}
logger.info({ offIslands }, "No client chunks for off-category islands");
