<script setup lang="ts">
import { computed } from "vue";
import { calendarMonths, type RailYear } from "@/activity/sections";

const props = defineProps<{
  /** Newest first, each with the months it has sections for. */
  years: readonly RailYear[];
  /** The month in view, `YYYY-MM`. The newest year stands in until one is. */
  active: string | null;
  /** Set while a jump is still loading the month it asked for. */
  busy?: boolean;
}>();

const emit = defineEmits<{ jump: [key: string] }>();

const activeYear = computed(
  () => props.active?.slice(0, 4) ?? props.years[0]?.year,
);

const months = computed(() => {
  const group = props.years.find((year) => year.year === activeYear.value);
  return group === undefined ? [] : calendarMonths(group);
});

/** A year jumps to its newest month. */
function jumpToYear(group: RailYear) {
  const newest = group.months[0];
  if (newest !== undefined) emit("jump", newest.key);
}

const cell =
  "flex h-7 w-full items-center justify-center rounded-[7px] font-mono text-[12px] text-dim transition-colors enabled:hover:bg-hover enabled:hover:text-foreground focus-visible:outline-2 focus-visible:outline-cat disabled:text-dim/35 aria-[current=true]:bg-background aria-[current=true]:text-cat aria-[current=true]:shadow-[0_1px_2px_var(--shadow)]";
</script>

<template>
  <nav aria-label="Months" :aria-busy="busy" class="flex flex-col gap-2">
    <!-- Every year fits in two rows at two digits apiece, where full years
         stacked four to a row pushed the months below the fold. -->
    <ul aria-label="Years" class="grid grid-cols-7 gap-0.5">
      <li v-for="group in years" :key="group.year">
        <button
          type="button"
          :aria-label="group.year"
          :aria-current="group.year === activeYear ? 'true' : undefined"
          :class="cell"
          @click="jumpToYear(group)"
        >
          &rsquo;{{ group.year.slice(2) }}
        </button>
      </li>
    </ul>
    <ul
      v-if="months.length"
      :aria-label="`Months of ${activeYear}`"
      class="grid grid-cols-6 gap-0.5 border-t border-foreground/10 pt-2"
    >
      <li v-for="month in months" :key="month.key">
        <button
          type="button"
          :aria-label="`${month.label} ${activeYear}`"
          :aria-current="month.key === active ? 'true' : undefined"
          :disabled="!month.present"
          :class="cell"
          @click="emit('jump', month.key)"
        >
          {{ month.label.slice(0, 3) }}
        </button>
      </li>
    </ul>
  </nav>
</template>
