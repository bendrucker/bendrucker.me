import path from "node:path";
import { compileTemplate, parse } from "@vue/compiler-sfc";
import { afterEach, describe, expect, it, vi } from "vitest";
import { feedback } from "./integration";

const root = "/project";
const filename = path.join(root, "src/components/Card.vue");

const source = `<script setup lang="ts">
const title = "Ride";
</script>

<template>
  <article>
    <h2>{{ title }}</h2>
    <MyChild />
  </article>
</template>
`;

function setup(command: "dev" | "build") {
  const { configure, sourceTransform } = feedback();
  const injectScript = vi.fn();
  configure({ command, root, injectScript });
  return { sourceTransform, injectScript };
}

function compile(
  sourceTransform: ReturnType<typeof feedback>["sourceTransform"],
  ssr: boolean,
) {
  const { descriptor } = parse(source, { filename });
  const template = descriptor.template;
  if (!template) throw new Error("fixture has no template");
  return compileTemplate({
    id: "card",
    filename,
    source: template.content,
    ssr,
    // `@vitejs/plugin-vue` hands over the descriptor's AST, whose locations
    // are positions in the whole file rather than in the template body.
    ast: template.ast,
    compilerOptions: { nodeTransforms: [sourceTransform] },
  }).code;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("feedback", () => {
  it.each([
    { name: "client", ssr: false },
    { name: "server", ssr: true },
  ])("stamps elements with their file line in $name output", ({ ssr }) => {
    const { sourceTransform, injectScript } = setup("dev");
    const code = compile(sourceTransform, ssr);
    expect(code).toContain("src/components/Card.vue:6");
    expect(code).toContain("src/components/Card.vue:7");
    expect(code).not.toContain("src/components/Card.vue:8");
    expect(injectScript).toHaveBeenCalledOnce();
  });

  it("leaves a plain build untouched", () => {
    vi.stubEnv("AGENTATION", "");
    const { sourceTransform, injectScript } = setup("build");
    expect(compile(sourceTransform, false)).not.toContain("data-source");
    expect(injectScript).not.toHaveBeenCalled();
  });

  it("includes the toolbar in a build run with AGENTATION=1", () => {
    vi.stubEnv("AGENTATION", "1");
    const { sourceTransform, injectScript } = setup("build");
    expect(compile(sourceTransform, false)).toContain("data-source");
    expect(injectScript).toHaveBeenCalledOnce();
  });
});
