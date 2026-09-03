<script setup lang="ts">
import { computed } from "vue";
import PowerPanel from "./PowerPanel.vue";
import RankedListPanel from "./RankedListPanel.vue";
import SectionHeading from "./SectionHeading.vue";
import SegmentedControl from "./SegmentedControl.vue";
import type { PowerBest, RankedList } from "@/activity/types";

const props = defineProps<{
  lists: RankedList[];
  bests: PowerBest[];
  periods: string[];
  period: string;
}>();

defineEmits<{ "update:period": [period: string] }>();

const periodOptions = computed(() =>
  props.periods.map((value) => ({ value, label: value })),
);
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-col gap-2">
      <SectionHeading label="personal records" as="h2" />
      <SegmentedControl
        v-if="periodOptions.length"
        :model-value="period"
        :options="periodOptions"
        label="Record period"
        size="sm"
        block
        @update:model-value="$emit('update:period', $event)"
      />
    </div>

    <PowerPanel :bests="bests" />

    <!-- Reachable by changing the period, which leaves focus on the control. -->
    <p
      v-if="!lists.length"
      role="status"
      class="text-[11px] text-foreground/70"
    >
      no records for this period
    </p>
    <ul
      v-else
      role="list"
      class="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-6 gap-y-5"
    >
      <li v-for="list in lists" :key="list.id">
        <RankedListPanel :list="list" />
      </li>
    </ul>
  </div>
</template>
