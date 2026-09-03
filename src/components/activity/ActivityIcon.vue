<script setup lang="ts">
export type IconName =
  | "user"
  | "users"
  | "search"
  | "arrow-down-narrow-wide"
  | "x"
  | "git-pull-request"
  | "file-check"
  | "git-merge"
  | "circle-dot"
  | "star"
  | "ellipsis"
  | "arrow-left"
  | "arrow-right";

defineProps<{ name: IconName }>();

/**
 * Tailwind extracts class candidates from source text, so an interpolated
 * class name here would generate no CSS.
 */
const classes: Record<IconName, string> = {
  user: "icon-[lucide--user]",
  users: "icon-[lucide--users]",
  search: "icon-[lucide--search]",
  "arrow-down-narrow-wide": "icon-[lucide--arrow-down-narrow-wide]",
  x: "icon-[lucide--x]",
  "git-pull-request": "icon-[lucide--git-pull-request]",
  "file-check": "icon-[lucide--file-check]",
  "git-merge": "icon-[lucide--git-merge]",
  "circle-dot": "icon-[lucide--circle-dot]",
  star: "icon-[lucide--star]",
  ellipsis: "icon-[lucide--ellipsis]",
  "arrow-left": "icon-[lucide--arrow-left]",
  "arrow-right": "icon-[lucide--arrow-right]",
};
</script>

<template>
  <span
    aria-hidden="true"
    class="inline-block size-[1.15em] align-[-.2em]"
    :class="classes[name]"
  />
</template>
