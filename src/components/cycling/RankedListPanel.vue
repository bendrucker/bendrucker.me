<script setup lang="ts">
import { computed } from "vue";
import SectionHeading from "./SectionHeading.vue";
import StatValue from "./StatValue.vue";
import type { RankedList, RankedRow } from "./types";
import { useUnits } from "./useUnits";

const props = defineProps<{ list: RankedList }>();

const {
  distanceUnit,
  elevationUnit,
  formatDistance,
  formatElevation,
  formatDuration,
  formatClock,
} = useUnits();

interface DisplayValue {
  display: string;
  unit?: string;
}

interface DisplayRow extends RankedRow, DisplayValue {
  rank: string;
}

function displayValue(value: number): DisplayValue {
  switch (props.list.metric) {
    case "distance":
      return { display: formatDistance(value), unit: distanceUnit.value };
    case "elevation":
      return { display: formatElevation(value), unit: elevationUnit.value };
    case "duration":
      return { display: formatDuration(value) };
    case "clock":
      return { display: formatClock(value) };
  }
}

const rows = computed<DisplayRow[]>(() =>
  props.list.rows.map((row, index) => ({
    ...row,
    rank: String(index + 1).padStart(2, "0"),
    ...displayValue(row.value),
  })),
);
</script>

<template>
  <div>
    <SectionHeading :label="list.title" as="h3" />
    <ol class="mt-2">
      <li
        v-for="(row, index) in rows"
        :key="row.id"
        class="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 border-b border-border py-1.5 last:border-b-0"
      >
        <span
          aria-hidden="true"
          class="font-sans text-[11px] font-extrabold tracking-tight"
          :class="index === 0 ? 'text-accent' : 'text-foreground/45'"
        >
          {{ row.rank }}
        </span>
        <span class="min-w-0 text-[12px]">
          <a
            v-if="row.href"
            :href="row.href"
            target="_blank"
            rel="noopener noreferrer"
            class="hover:text-accent"
          >
            {{ row.name }}
          </a>
          <template v-else>{{ row.name }}</template>
          <span v-if="row.detail" class="ml-1.5 text-foreground/50">
            {{ row.detail }}
          </span>
        </span>
        <StatValue :value="row.display" :unit="row.unit" size="sm" />
      </li>
    </ol>
  </div>
</template>
