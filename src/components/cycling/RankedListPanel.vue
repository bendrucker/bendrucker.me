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
  /** Names the number for a screen reader when no unit follows it. */
  measure?: string;
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
      return { display: formatDuration(value), measure: "time" };
    case "clock":
      return { display: formatClock(value), measure: "time" };
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
    <SectionHeading :label="list.title" :icon="list.icon" as="h3" />
    <p v-if="!rows.length" class="mt-2 text-[11px] text-foreground/70">
      nothing here yet
    </p>
    <!-- Tailwind's reset removes the marker, and Safari drops list semantics
         with it unless the role is stated. -->
    <ol v-else role="list" class="mt-2">
      <li
        v-for="(row, index) in rows"
        :key="row.id"
        class="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 border-b border-border py-1.5 last:border-b-0"
      >
        <span
          aria-hidden="true"
          class="font-sans text-[11px] font-extrabold tracking-tight"
          :class="index === 0 ? 'text-accent' : 'text-foreground/70'"
        >
          {{ row.rank }}
        </span>
        <span class="min-w-0 text-[12px]">
          <!-- A list mixes linked and unlinked rows, so the linked ones need a
               mark that survives without a pointer and without color. -->
          <a
            v-if="row.href"
            :href="row.href"
            target="_blank"
            rel="noopener noreferrer"
            class="underline decoration-border decoration-dotted underline-offset-2 hover:text-accent"
          >
            {{ row.name }}
          </a>
          <template v-else>{{ row.name }}</template>
          <span v-if="row.detail" class="ml-1.5 text-foreground/70">
            {{ row.detail }}
          </span>
        </span>
        <StatValue
          :value="row.display"
          :unit="row.unit"
          :label="row.measure"
          size="sm"
        />
      </li>
    </ol>
  </div>
</template>
