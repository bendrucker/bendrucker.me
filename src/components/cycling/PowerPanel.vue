<script setup lang="ts">
import SectionHeading from "./SectionHeading.vue";
import StatValue from "./StatValue.vue";
import type { PowerBest } from "@/activity/types";

defineProps<{ bests: PowerBest[] }>();
</script>

<template>
  <div class="rounded-lg border border-accent/40 px-4 py-3">
    <SectionHeading label="best power" icon="zap" as="h3" />
    <p v-if="!bests.length" class="mt-3 text-[10.5px] text-foreground/70">
      nothing here yet
    </p>
    <ul
      v-else
      role="list"
      class="mt-3 grid grid-cols-[repeat(auto-fit,minmax(76px,1fr))] gap-x-4 gap-y-3"
    >
      <li v-for="best in bests" :key="best.id">
        <template v-if="best.watts === null">
          <span aria-hidden="true"><StatValue value="—" size="lg" /></span>
          <span class="sr-only">no power data</span>
        </template>
        <StatValue v-else :value="String(best.watts)" unit="W" size="lg" />
        <p class="text-[10.5px] text-foreground/70">{{ best.label }}</p>
      </li>
    </ul>
  </div>
</template>
