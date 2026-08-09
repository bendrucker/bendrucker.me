import eslintPluginAstro from "eslint-plugin-astro";
import eslintPluginVue from "eslint-plugin-vue";
import globals from "globals";
import tseslint from "typescript-eslint";
import vueParser from "vue-eslint-parser";

export default [
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  // Essential only. The stricter tiers are mostly formatting rules that
  // disagree with Prettier, which already owns formatting in this repo.
  ...eslintPluginVue.configs["flat/essential"],
  {
    // typescript-eslint claims .vue, but its parser reads the whole file as
    // TypeScript and chokes on the template. vue-eslint-parser has to own the
    // file and hand only the script block down.
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, extraFileExtensions: [".vue"] },
    },
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  { rules: { "no-console": "error" } },
  {
    ignores: [
      "dist/**",
      ".worktrees/**",
      "tmp/**",
      ".astro",
      "**/worker-configuration.d.ts",
    ],
  },
];
