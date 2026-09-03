<script setup lang="ts">
import LucideIcon from "./LucideIcon.vue";
import type { IconName } from "@/activity/types";

withDefaults(
  defineProps<{
    label: string;
    /** Decorative icon ahead of the label, kept out of the accessible name. */
    icon?: IconName;
    summary?: string;
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
  }>(),
  { as: "h2" },
);
</script>

<template>
  <div class="flex items-center gap-2">
    <component
      :is="as"
      class="shrink-0 text-[11px] font-bold tracking-[.1em] whitespace-nowrap"
    >
      <LucideIcon v-if="icon" :name="icon" class="mr-1" />{{ label }}
    </component>
    <span
      aria-hidden="true"
      class="min-w-4 flex-1 border-t border-dashed border-border"
    />
    <span
      v-if="summary"
      class="min-w-0 truncate text-[11px] text-foreground/70"
    >
      {{ summary }}
    </span>
  </div>
</template>
