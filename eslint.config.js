import eslintPluginAstro from "eslint-plugin-astro";
import eslintPluginVue from "eslint-plugin-vue";
import oxlint from "eslint-plugin-oxlint";
import tsParser from "@typescript-eslint/parser";
import vueParser from "vue-eslint-parser";

const ASTRO_FILES = ["*.astro", "**/*.astro"];

// Matches .oxlintrc.json, so the same comparison isn't an error in a template
// and fine everywhere else. `== null` is the deliberate null-or-undefined idiom.
const EQEQEQ = ["error", "always", { null: "ignore" }];

// Both plugins ship at least one config entry with no `files` key, which
// makes it apply to every linted file rather than just its own. Scope those
// entries explicitly. Entries that already declare `files` (astro's virtual
// `**/*.astro/*.ts` files, vue's own `**/*.vue` base) are left alone.
const vueConfigs = eslintPluginVue.configs["flat/essential"].map((config) =>
  config.files ? config : { ...config, files: ["**/*.vue"] },
);
const astroConfigs = eslintPluginAstro.configs.recommended.map((config) =>
  config.files ? config : { ...config, files: ASTRO_FILES },
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
  // Silences the rules oxlint already covers, read straight from
  // .oxlintrc.json so the two stay in lockstep. This emits an entry with no
  // `files` key, so it switches those rules off for every file type, .astro
  // and .vue included. Anything below that re-enables one is deliberate.
  ...oxlint.buildFromOxlintConfigFile("./.oxlintrc.json"),
  {
    // oxlint parses .astro frontmatter and <script> blocks, but not template
    // expressions: `{items.sort()}` and `class={a == b ? ... }` are invisible
    // to it. This block covers the template.
    //
    // It must stay after the spread above. In flat config the last matching
    // entry wins, and the spread's unscoped entry turns these rules off.
    files: ASTRO_FILES,
    rules: { "no-console": "error", eqeqeq: EQEQEQ },
  },
  {
    // Same blind spot in .vue: oxlint's vue plugin reads <script>, never
    // <template>. eslint-plugin-vue only offers template-body traversal for a
    // fixed list of hand-wrapped core rules, and these are the two of them
    // that .oxlintrc.json enables. The rest of what oxlint checks in <script>
    // has no config-only path into <template>.
    files: ["**/*.vue"],
    rules: { "vue/no-console": "error", "vue/eqeqeq": EQEQEQ },
  },
  {
    // oxlint owns plain .ts/.js files entirely. Without this, eslint-plugin-oxlint's
    // generated config (which mirrors oxlint's file scope to turn off overlapping rules)
    // makes ESLint's directory walk pick them up too, and it parses them with the default
    // parser (espree), which chokes on TypeScript syntax.
    //
    // The `**/*.js` and `**/*.ts` globs also match the virtual `foo.astro/0_0.js`
    // paths the astro processor emits, so ESLint contributes nothing inside an
    // .astro <script> block. oxlint covers those.
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
