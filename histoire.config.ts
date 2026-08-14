import { HstVue } from "@histoire/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "histoire";
import path from "node:path";

const root = import.meta.dirname;

// Histoire's file watcher matches these globs against absolute paths without
// micromatch's `dot` option. A checkout under a dot-prefixed directory, which
// is where `wt` puts worktrees, defeats a leading `**/`: it cannot cross the
// dot segment, so the relative patterns silently match nothing. Anchoring each
// pattern at the project root keeps the literal dot out of the glob. Both forms
// are kept because story discovery matches the relative one.
const IGNORED_DIRS = ["node_modules", "dist", ".git", ".histoire", "tmp"];

// `.git` is a file rather than a directory in a worktree. Globby stats each
// anchored pattern's base, and statting a path under a file throws ENOTDIR, so
// only the entries that are always directories get the absolute form.
const ANCHORED_DIRS = ["node_modules", "dist", ".histoire", "tmp"];

// Histoire runs its own Vite server rather than Astro's. Everything Vue
// components rely on has to be restated here: the SFC compiler that
// @astrojs/vue would normally supply, Tailwind, and the `@` alias.
export default defineConfig({
  plugins: [HstVue()],
  setupFile: { browser: "/src/histoire.setup.ts" },
  storyMatch: ["src/**/*.story.vue"],
  storyIgnored: [
    ...IGNORED_DIRS.map((dir) => `**/${dir}/**`),
    ...ANCHORED_DIRS.map((dir) => path.join(root, dir, "**")),
  ],
  theme: {
    title: "bendrucker.me",
    defaultColorScheme: "auto",
  },
  vite: {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(root, "src"),
      },
    },
  },
});
