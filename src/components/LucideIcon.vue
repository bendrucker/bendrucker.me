<script setup lang="ts">
import type { IconName } from "@/activity/types";

defineProps<{ name: IconName }>();

/**
 * Written out rather than built from the name, because Tailwind extracts
 * candidates from source text and never sees an interpolated class.
 */
const classes: Record<IconName, string> = {
  "arrow-down-narrow-wide": "icon-[lucide--arrow-down-narrow-wide]",
  "arrow-left": "icon-[lucide--arrow-left]",
  "arrow-right": "icon-[lucide--arrow-right]",
  "circle-dot": "icon-[lucide--circle-dot]",
  clock: "icon-[lucide--clock]",
  ellipsis: "icon-[lucide--ellipsis]",
  "file-check": "icon-[lucide--file-check]",
  flag: "icon-[lucide--flag]",
  flame: "icon-[lucide--flame]",
  gauge: "icon-[lucide--gauge]",
  "git-merge": "icon-[lucide--git-merge]",
  "git-pull-request": "icon-[lucide--git-pull-request]",
  "map-pin": "icon-[lucide--map-pin]",
  mountain: "icon-[lucide--mountain]",
  ruler: "icon-[lucide--ruler]",
  search: "icon-[lucide--search]",
  star: "icon-[lucide--star]",
  timer: "icon-[lucide--timer]",
  "trending-up": "icon-[lucide--trending-up]",
  user: "icon-[lucide--user]",
  users: "icon-[lucide--users]",
  x: "icon-[lucide--x]",
  zap: "icon-[lucide--zap]",
};
</script>

<template>
  <span
    aria-hidden="true"
    class="inline-block size-[1.15em] align-[-.2em]"
    :class="classes[name]"
  />
</template>
