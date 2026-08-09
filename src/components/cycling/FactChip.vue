<script setup lang="ts">
import type { RideFact } from "./types";

defineProps<{ fact: RideFact }>();
</script>

<template>
  <span
    class="inline-block rounded-full border border-border bg-background px-2 py-0.5 text-[10px] whitespace-nowrap text-foreground/65"
  >
    {{ fact.label }}
  </span>
</template>
