<script setup lang="ts">
import { computed } from "vue";

/**
 * A repository's primary language as its logo, in the language's own
 * color. Written out rather than built from the name, because Tailwind
 * extracts candidates from source text and never sees an interpolated
 * class. A language with no logo here shows its color as a dot.
 */
const props = defineProps<{ language: { name: string; color: string } }>();

const logos: Record<string, string> = {
  Astro: "icon-[simple-icons--astro]",
  C: "icon-[simple-icons--c]",
  "C++": "icon-[simple-icons--cplusplus]",
  "C#": "icon-[simple-icons--dotnet]",
  Clojure: "icon-[simple-icons--clojure]",
  Crystal: "icon-[simple-icons--crystal]",
  CSS: "icon-[simple-icons--css]",
  Dart: "icon-[simple-icons--dart]",
  Dockerfile: "icon-[simple-icons--docker]",
  Elixir: "icon-[simple-icons--elixir]",
  Erlang: "icon-[simple-icons--erlang]",
  Gherkin: "icon-[simple-icons--cucumber]",
  Gleam: "icon-[simple-icons--gleam]",
  Go: "icon-[simple-icons--go]",
  GraphQL: "icon-[simple-icons--graphql]",
  Haskell: "icon-[simple-icons--haskell]",
  HCL: "icon-[simple-icons--terraform]",
  HTML: "icon-[simple-icons--html5]",
  Java: "icon-[simple-icons--openjdk]",
  JavaScript: "icon-[simple-icons--javascript]",
  Jinja: "icon-[simple-icons--jinja]",
  Julia: "icon-[simple-icons--julia]",
  Kotlin: "icon-[simple-icons--kotlin]",
  Lua: "icon-[simple-icons--lua]",
  Markdown: "icon-[simple-icons--markdown]",
  MDX: "icon-[simple-icons--mdx]",
  Nim: "icon-[simple-icons--nim]",
  Nix: "icon-[simple-icons--nixos]",
  OCaml: "icon-[simple-icons--ocaml]",
  Perl: "icon-[simple-icons--perl]",
  PHP: "icon-[simple-icons--php]",
  PLpgSQL: "icon-[simple-icons--postgresql]",
  Python: "icon-[simple-icons--python]",
  R: "icon-[simple-icons--r]",
  Ruby: "icon-[simple-icons--ruby]",
  Rust: "icon-[simple-icons--rust]",
  Scala: "icon-[simple-icons--scala]",
  SCSS: "icon-[simple-icons--sass]",
  Shell: "icon-[simple-icons--gnubash]",
  Solidity: "icon-[simple-icons--solidity]",
  Svelte: "icon-[simple-icons--svelte]",
  Swift: "icon-[simple-icons--swift]",
  TeX: "icon-[simple-icons--latex]",
  Terraform: "icon-[simple-icons--terraform]",
  TypeScript: "icon-[simple-icons--typescript]",
  Vue: "icon-[simple-icons--vuedotjs]",
  WebAssembly: "icon-[simple-icons--webassembly]",
  YAML: "icon-[simple-icons--yaml]",
  Zig: "icon-[simple-icons--zig]",
};

const logo = computed(() => logos[props.language.name]);
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center"
    :title="language.name"
    :style="{ color: language.color }"
  >
    <span v-if="logo" :class="logo" class="size-3.5" aria-hidden="true"></span>
    <span
      v-else
      class="inline-block size-2 rounded-full bg-current"
      aria-hidden="true"
    ></span>
    <span class="sr-only">{{ language.name }}</span>
  </span>
</template>
