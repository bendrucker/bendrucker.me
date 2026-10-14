import { cpSync, readdirSync, rmdirSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { isCategoryId, isEnabled, type CategoryEnv } from "./config";

/**
 * Whether a file under `static/` belongs in this build's public assets.
 * Fixture art lives in `fixtures/<category>/` and ships only while its
 * category is on, so a reader cannot request art for a category that is off.
 * A fixture outside any category directory is never published.
 */
export function isPublished(path: string, env: CategoryEnv): boolean {
  const [top, category] = path.split(/[\\/]/).filter(Boolean);
  if (top !== "fixtures" || category === undefined) return true;
  return isCategoryId(category) && isEnabled(category, env);
}

/**
 * Replaces `dest` with the files of `src` that `isPublished` keeps. `dest` is
 * cleared first because it outlives a build: art copied by a development run
 * would otherwise ride along into the next production one.
 */
export function copyStaticAssets(
  src: string,
  dest: string,
  env: CategoryEnv,
): void {
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, {
    recursive: true,
    filter: (path) => isPublished(relative(src, path), env),
  });
  removeEmptyDirectories(dest);
}

// `cpSync` creates a directory before filtering its contents, so `fixtures/`
// would otherwise ship empty with every category's art filtered out of it.
function removeEmptyDirectories(dir: string): boolean {
  const entries = readdirSync(dir, { withFileTypes: true });
  const kept = entries.filter(
    (entry) =>
      !entry.isDirectory() || !removeEmptyDirectories(join(dir, entry.name)),
  );
  if (kept.length > 0) return false;
  rmdirSync(dir);
  return true;
}
