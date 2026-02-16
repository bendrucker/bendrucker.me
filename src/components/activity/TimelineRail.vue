<script setup lang="ts">
import { computed } from "vue";
import type { YearCount } from "./composables/useActivityApi";

const MAX_VISIBLE = 7;

const props = defineProps<{
  years: YearCount[];
  currentYear: number | null;
  loadedYears: Set<number>;
}>();

const emit = defineEmits<{
  navigate: [year: number];
}>();

const visibleYears = computed(() => {
  if (props.years.length <= MAX_VISIBLE) return props.years;

  const currentIdx = props.years.findIndex(
    (y) => y.year === props.currentYear,
  );
  const center = currentIdx >= 0 ? currentIdx : 0;
  const half = Math.floor(MAX_VISIBLE / 2);
  let start = Math.max(0, center - half);
  let end = start + MAX_VISIBLE;

  if (end > props.years.length) {
    end = props.years.length;
    start = Math.max(0, end - MAX_VISIBLE);
  }

  return props.years.slice(start, end);
});

const hasOlderYears = computed(() => {
  if (props.years.length <= MAX_VISIBLE) return false;
  const last = visibleYears.value[visibleYears.value.length - 1];
  const allLast = props.years[props.years.length - 1];
  return last && allLast && last.year > allLast.year;
});

const hasNewerYears = computed(() => {
  if (props.years.length <= MAX_VISIBLE) return false;
  const first = visibleYears.value[0];
  const allFirst = props.years[0];
  return first && allFirst && first.year < allFirst.year;
});
</script>

<template>
  <nav
    v-if="years.length > 0"
    class="hidden lg:flex absolute -right-16 top-0 h-full"
    aria-label="Year navigation"
  >
    <div class="sticky top-1/2 -translate-y-1/2 flex flex-col items-end gap-1 h-fit">
      <span v-if="hasNewerYears" class="text-sm text-foreground/20 px-1.5">&hellip;</span>
      <template v-for="y in visibleYears" :key="y.year">
        <button
          v-if="loadedYears.has(y.year)"
          class="text-sm tabular-nums transition-colors px-1.5 py-0.5 rounded"
          :class="currentYear === y.year
            ? 'text-accent font-semibold'
            : 'text-foreground/30 hover:text-foreground/60'"
          @click="emit('navigate', y.year)"
        >
          {{ y.year }}
        </button>
        <a
          v-else
          :href="`/activity/code/${y.year}`"
          class="text-sm tabular-nums transition-colors px-1.5 py-0.5 rounded"
          :class="currentYear === y.year
            ? 'text-accent font-semibold'
            : 'text-foreground/30 hover:text-foreground/60'"
        >
          {{ y.year }}
        </a>
      </template>
      <span v-if="hasOlderYears" class="text-sm text-foreground/20 px-1.5">&hellip;</span>
    </div>
  </nav>
</template>
