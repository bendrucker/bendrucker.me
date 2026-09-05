import { defineConfig } from "vitest/config";
import path from "node:path";

const workspace = (name: string) =>
  path.resolve(import.meta.dirname, "packages", name, "src/index.ts");

export default defineConfig({
  resolve: {
    // The workspace packages point `main` at `dist`, which only `build:packages`
    // produces. The suite runs from a bare `npm ci`, so it reads their source.
    alias: {
      "@workspace/logger": workspace("logger"),
      "@workspace/github": workspace("github"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "packages/**/*.test.ts"],
  },
});
