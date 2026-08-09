<script setup lang="ts">
import type { RideBadge } from "./types";

defineProps<{ badge: RideBadge }>();
</script>

<template>
  <span
    class="inline-block rounded-sm border border-dashed border-accent px-1.5 py-px text-[10px] whitespace-nowrap text-accent"
  >
    {{ badge.label }}
  </span>
</template>
