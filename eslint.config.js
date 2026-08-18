import eslintPluginAstro from "eslint-plugin-astro";
import eslintPluginVue from "eslint-plugin-vue";
import oxlint from "eslint-plugin-oxlint";
import tsParser from "@typescript-eslint/parser";
import vueParser from "vue-eslint-parser";

// Both plugins ship at least one config entry with no `files` key, which
// makes it apply to every linted file rather than just its own. Scope those
// entries explicitly. Entries that already declare `files` (astro's virtual
// `**/*.astro/*.ts` files, vue's own `**/*.vue` base) are left alone.
const vueConfigs = eslintPluginVue.configs["flat/essential"].map((config) =>
  config.files ? config : { ...config, files: ["**/*.vue"] },
);
const astroConfigs = eslintPluginAstro.configs.recommended.map((config) =>
  config.files ? config : { ...config, files: ["*.astro", "**/*.astro"] },
);

export default [
  ...vueConfigs,
  ...astroConfigs,
  {
    // vue-eslint-parser owns the whole .vue file and hands the script block
    // to an inner parser. It has to be @typescript-eslint/parser: 53 of 54
    // SFCs use <script setup lang="ts">, and the default (espree) can't read
    // TypeScript syntax.
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: [".vue"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // oxlint doesn't lint .astro at all, so no-console has to stay here. It's
    // covered on every other file type by oxlint's own no-console rule.
    files: ["*.astro", "**/*.astro"],
    rules: { "no-console": "error" },
  },
  // Silences the 39 vue rules oxlint already covers, read straight from
  // .oxlintrc.json so the two stay in lockstep.
  ...oxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),
  {
    // oxlint owns plain .ts/.js files entirely now. Without this, eslint-plugin-oxlint's
    // generated config (which mirrors oxlint's file scope to turn off overlapping rules)
    // makes ESLint's directory walk pick them up too, and it parses them with the default
    // parser (espree), which chokes on TypeScript syntax. This doesn't affect the virtual
    // `**/*.astro/*.ts` blocks astro's processor creates, since those never touch disk.
    ignores: [
      "dist/**",
      ".histoire/**",
      ".worktrees/**",
      "tmp/**",
      ".astro",
      "**/worker-configuration.d.ts",
      "**/*.ts",
      "**/*.tsx",
      "**/*.mts",
      "**/*.cts",
      "**/*.js",
      "**/*.mjs",
      "**/*.cjs",
    ],
  },
];
