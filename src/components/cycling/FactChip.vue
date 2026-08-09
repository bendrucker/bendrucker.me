<script setup lang="ts">
import type { RideFact } from "./types";

defineProps<{ fact: RideFact }>();
</script>

<template>
  <span
    class="inline-block rounded-full border border-border px-2 py-0.5 text-[10px] whitespace-nowrap text-foreground/70"
  >
    <span v-if="fact.icon" aria-hidden="true">{{ fact.icon }} </span
    >{{ fact.label }}
  </span>
</template>
