<script setup lang="ts">
import type { IconName } from "@/activity/types";

defineProps<{ name: IconName }>();

/**
 * Written out rather than built from the name, because Tailwind extracts
 * candidates from source text and never sees an interpolated class.
 */
const classes: Record<IconName, string> = {
  clock: "icon-[lucide--clock]",
  flag: "icon-[lucide--flag]",
  flame: "icon-[lucide--flame]",
  gauge: "icon-[lucide--gauge]",
  "map-pin": "icon-[lucide--map-pin]",
  mountain: "icon-[lucide--mountain]",
  ruler: "icon-[lucide--ruler]",
  timer: "icon-[lucide--timer]",
  "trending-up": "icon-[lucide--trending-up]",
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
