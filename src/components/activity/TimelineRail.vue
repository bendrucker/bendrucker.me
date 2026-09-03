<script setup lang="ts">
import { computed, ref } from "vue";
import type { YearCount } from "@/activity/types";
import LucideIcon from "@/components/LucideIcon.vue";

const MAX_VISIBLE = 7;

const props = defineProps<{
  years: YearCount[];
  currentYear: number | null;
  loadedYears: Set<number>;
}>();

const emit = defineEmits<{
  navigate: [year: number];
}>();

const expanded = ref(false);

const windowedYears = computed(() => {
  const currentIdx = props.years.findIndex((y) => y.year === props.currentYear);
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

const visibleYears = computed(() => {
  if (expanded.value || props.years.length <= MAX_VISIBLE) return props.years;
  return windowedYears.value;
});

const hasOlderYears = computed(() => {
  if (expanded.value || props.years.length <= MAX_VISIBLE) return false;
  const last = windowedYears.value.at(-1);
  const allLast = props.years.at(-1);
  return last && allLast && last.year > allLast.year;
});

const hasNewerYears = computed(() => {
  if (expanded.value || props.years.length <= MAX_VISIBLE) return false;
  const first = windowedYears.value[0];
  const allFirst = props.years[0];
  return first && allFirst && first.year < allFirst.year;
});
</script>

<template>
  <nav
    v-if="years.length > 0"
    class="absolute top-0 -right-16 hidden h-full lg:flex"
    aria-label="Year navigation"
  >
    <div
      class="sticky top-1/2 flex h-fit -translate-y-1/2 flex-col items-end gap-1"
    >
      <button
        v-if="hasNewerYears"
        class="px-1.5 text-sm text-foreground/20 transition-colors hover:text-foreground/40"
        aria-label="Show all years"
        @click="expanded = true"
      >
        <LucideIcon name="ellipsis" />
      </button>
      <template v-for="y in visibleYears" :key="y.year">
        <button
          v-if="loadedYears.has(y.year)"
          class="rounded px-1.5 py-0.5 text-sm tabular-nums transition-colors"
          :class="
            currentYear === y.year
              ? 'font-semibold text-accent'
              : 'text-foreground/30 hover:text-foreground/60'
          "
          @click="emit('navigate', y.year)"
        >
          {{ y.year }}
        </button>
        <a
          v-else
          :href="`/activity/code/${y.year}`"
          class="rounded px-1.5 py-0.5 text-sm tabular-nums transition-colors"
          :class="
            currentYear === y.year
              ? 'font-semibold text-accent'
              : 'text-foreground/30 hover:text-foreground/60'
          "
        >
          {{ y.year }}
        </a>
      </template>
      <button
        v-if="hasOlderYears"
        class="px-1.5 text-sm text-foreground/20 transition-colors hover:text-foreground/40"
        aria-label="Show all years"
        @click="expanded = true"
      >
        <LucideIcon name="ellipsis" />
      </button>
    </div>
  </nav>
</template>
