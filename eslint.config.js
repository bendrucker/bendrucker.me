import eslintPluginAstro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
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
      ".worktrees/**",
      "public/pagefind/**",
      "**/worker-configuration.d.ts",
    ],
  },
];
