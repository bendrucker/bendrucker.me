<script setup lang="ts">
import type { IconName } from "@/activity/types";
import LucideIcon from "./LucideIcon.vue";

/** One figure in a row's stat line: an icon standing in for its label. */
defineProps<{ icon: IconName; label: string }>();
</script>

<template>
  <span class="flex items-center gap-1 whitespace-nowrap" :title="label">
    <LucideIcon :name="icon" class="text-foreground/45" />
    <span class="sr-only">{{ label }}:</span>
    <slot />
  </span>
</template>
