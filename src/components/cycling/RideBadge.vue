<script setup lang="ts">
import LucideIcon from "./LucideIcon.vue";
import type { RideBadge } from "@/activity/types";

defineProps<{ badge: RideBadge }>();
</script>

<template>
  <span
    class="inline-block rounded-sm border border-dashed border-accent px-1.5 py-px text-[10px] whitespace-nowrap text-accent"
  >
    <LucideIcon v-if="badge.icon" :name="badge.icon" class="mr-1" />{{
      badge.label
    }}
  </span>
</template>
