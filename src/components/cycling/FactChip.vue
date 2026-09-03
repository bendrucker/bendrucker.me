<script setup lang="ts">
import LucideIcon from "./LucideIcon.vue";
import type { RideFact } from "@/activity/types";

defineProps<{ fact: RideFact }>();
</script>

<template>
  <span
    class="inline-block rounded-full border border-border px-2 py-0.5 text-[10px] whitespace-nowrap text-foreground/70"
  >
    <LucideIcon v-if="fact.icon" :name="fact.icon" class="mr-1" />{{
      fact.label
    }}
  </span>
</template>
