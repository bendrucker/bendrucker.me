<script setup lang="ts">
import StatValue from "./StatValue.vue";
import type { PowerBest } from "./types";

defineProps<{ bests: PowerBest[]; sourceNote?: string }>();
</script>

<template>
  <div class="rounded-lg border border-accent/40 p-3">
    <h3 class="text-[11px] font-bold tracking-[.1em]">
      <span aria-hidden="true">⚡ </span>best power
    </h3>
    <ul
      class="mt-3 grid grid-cols-[repeat(auto-fit,minmax(76px,1fr))] gap-x-4 gap-y-3"
    >
      <li v-for="best in bests" :key="best.id">
        <template v-if="best.watts === null">
          <span aria-hidden="true"><StatValue value="—" size="lg" /></span>
          <span class="sr-only">no data</span>
        </template>
        <StatValue v-else :value="String(best.watts)" unit="W" size="lg" />
        <p class="text-[10.5px] text-foreground/55">{{ best.label }}</p>
      </li>
    </ul>
    <p v-if="sourceNote" class="mt-3 text-[10.5px] text-foreground/55">
      {{ sourceNote }}
    </p>
  </div>
</template>
