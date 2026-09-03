<script setup lang="ts">
import LucideIcon from "@/components/LucideIcon.vue";
import type { RideBadge } from "@/activity/types";

defineProps<{ badge: RideBadge }>();
</script>

<template>
  <!-- Two segments, the window on the left and what was won on the right. The
       reading order is what carries the meaning, so the scope is real text
       rather than a border or a tint. -->
  <span
    class="inline-flex items-stretch overflow-hidden rounded-sm border border-accent/60 text-[10px] whitespace-nowrap"
  >
    <span
      v-if="badge.scope"
      class="bg-accent/15 px-1.5 py-px text-accent/80"
      aria-hidden="true"
      >{{ badge.scope }}</span
    >
    <span
      class="px-1.5 py-px text-accent"
      :class="badge.scope ? 'border-l border-accent/60' : ''"
    >
      <LucideIcon v-if="badge.icon" :name="badge.icon" class="mr-1" />{{
        badge.label
      }}
    </span>
    <!-- "aug longest" is what the eye reads and the wrong thing to hear. The
         two segments are announced as one phrase instead. -->
    <span v-if="badge.scope" class="sr-only">
      {{ badge.label }} in {{ badge.scope }}
    </span>
  </span>
</template>
