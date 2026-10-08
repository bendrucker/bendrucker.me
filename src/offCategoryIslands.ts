// Astro bundles every component a page hydrates, whether or not the condition
// around it ever renders it, so a category that is off would still publish its
// islands under `_astro/`. In the client build this swaps each such component
// for an empty one, which leaves its chunk out. The server keeps the real
// component, which is never rendered there either.
import path from "node:path";
import type { Plugin } from "vite";
import { isEnabled, type CategoryEnv, type CategoryId } from "./config";

const MEDIA_DIR = path.join("src", "components", "media");
const MEDIA: CategoryId[] = ["reading", "watching", "listening"];

// The categories that render each media component. One not listed here
// belongs to all three.
const ISLAND_CATEGORIES: Record<string, CategoryId[]> = {
  "PosterShelf.vue": ["reading", "watching"],
  "RecordShelf.vue": ["listening"],
};

const STUB_PREFIX = "\0off-category-island-";

/** Whether the client build should leave out the component at this path. */
export function isOffCategoryIsland(file: string, env: CategoryEnv): boolean {
  if (path.dirname(file).endsWith(MEDIA_DIR) && file.endsWith(".vue")) {
    const categories = ISLAND_CATEGORIES[path.basename(file)] ?? MEDIA;
    return !categories.some((category) => isEnabled(category, env));
  }
  return false;
}

export function offCategoryIslands(env: () => CategoryEnv): Plugin {
  const stubs = new Map<string, string>();

  return {
    name: "off-category-islands",
    enforce: "pre",
    applyToEnvironment: (environment) => environment.name === "client",
    async resolveId(source, importer, options) {
      if (!source.endsWith(".vue")) return null;
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });
      if (!resolved || !isOffCategoryIsland(resolved.id, env())) return null;

      const known = stubs.get(resolved.id);
      if (known) return known;
      const stub = `${STUB_PREFIX}${stubs.size}`;
      stubs.set(resolved.id, stub);
      return stub;
    },
    load(id) {
      return id.startsWith(STUB_PREFIX)
        ? "export default { render: () => null };"
        : null;
    },
  };
}
