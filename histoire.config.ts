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
  // Groups are the only ordered level of the sidebar: Histoire renders them in
  // the order declared here and sorts everything below them by title. Stories
  // name their group rather than carrying a `Section/` title prefix, so the
  // tree stays two deep and a component is one tap from the root on a phone.
  tree: {
    groups: [
      { id: "cycling-views", title: "Cycling views" },
      { id: "ride", title: "Ride" },
      { id: "records", title: "Records" },
      { id: "primitives", title: "Primitives" },
      { id: "code", title: "Code activity" },
    ],
  },
  // The phone sizes the components are designed against. The dropdown these
  // feed sits in the single-layout toolbar, which is how a story gets reviewed
  // at a real phone width from a desktop browser.
  responsivePresets: [
    { label: "iPhone SE", width: 375, height: 667 },
    { label: "iPhone 14", width: 390, height: 844 },
    { label: "iPhone 14 Plus", width: 430, height: 932 },
    { label: "iPad mini", width: 744, height: 1133 },
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
