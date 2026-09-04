<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { BASEMAP_CREDITS } from "./basemap";
import HighlightsView from "./HighlightsView.vue";
import LogView from "./LogView.vue";
import PhotoLightbox from "./PhotoLightbox.vue";
import PrsView from "./PrsView.vue";
import SegmentedControl from "./SegmentedControl.vue";
import type { CyclingActivityData, Ride } from "@/activity/types";
import type { SegmentedOption, Units, ViewMode } from "./types";
import { useLogPages } from "./useLogPages";
import { provideUnits } from "./useUnits";
import YearSummary from "./YearSummary.vue";

const props = defineProps<{ data: CyclingActivityData }>();

const mode = defineModel<ViewMode>("mode", { default: "log" });
const units = defineModel<Units>("units", { default: "imperial" });
const recordPeriod = defineModel<string>("recordPeriod", { default: "all" });

provideUnits(units);

const MODES: (SegmentedOption & { value: ViewMode })[] = [
  { value: "log", label: "log" },
  { value: "highlights", label: "highlights" },
  { value: "prs", label: "prs", name: "personal records" },
];

const UNITS: (SegmentedOption & { value: Units })[] = [
  { value: "imperial", label: "mi", name: "miles" },
  { value: "metric", label: "km", name: "kilometers" },
];

// The control speaks in strings, so the payload is matched back against the
// option list rather than asserted into the union.
function selectMode(value: string) {
  const next = MODES.find((option) => option.value === value);
  if (next) mode.value = next.value;
}

function selectUnits(value: string) {
  const next = UNITS.find((option) => option.value === value);
  if (next) units.value = next.value;
}

// The log grows past what the page rendered, so its months live in local
// state. The highlights stay at the initial window: a highlights view whose
// length depends on how far the log scrolled is not one worth having.
const {
  months: logMonths,
  hasMore,
  loading,
  failed,
  loadMore,
} = useLogPages(props.data.months, props.data.logCursor);

const periods = computed(() => props.data.records.map((entry) => entry.period));

// A year without a basemap owes CARTO nothing.
const hasBasemap = computed(() =>
  props.data.months.some((month) => month.rides.some((ride) => ride.route)),
);

const records = computed(
  () =>
    props.data.records.find((entry) => entry.period === recordPeriod.value) ??
    props.data.records[0],
);

// A period the data no longer carries falls back to the first one offered. The
// model is corrected to match, so the control and whatever a page syncs it to
// name the records actually on screen.
watch(
  records,
  (entry) => {
    if (entry && entry.period !== recordPeriod.value) {
      recordPeriod.value = entry.period;
    }
  },
  { immediate: true },
);

const modeLabel = computed(() => {
  const option = MODES.find((entry) => entry.value === mode.value);
  return option ? (option.name ?? option.label) : "";
});

const lightboxRide = ref<Ride | null>(null);
const photoIndex = ref(0);

function openPhoto(ride: Ride, index: number) {
  lightboxRide.value = ride;
  photoIndex.value = index;
}

// The lightbox belongs to the ride that opened it. Leaving the log, or swapping
// the data under it, would strand a dialog over a view that no longer shows it.
watch([mode, () => props.data], () => {
  lightboxRide.value = null;
});
</script>

<template>
  <div class="flex flex-col gap-5 bg-background text-foreground">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <SegmentedControl
        :model-value="mode"
        :options="MODES"
        label="Activity view"
        @update:model-value="selectMode"
      />
      <SegmentedControl
        :model-value="units"
        :options="UNITS"
        label="Units"
        size="sm"
        @update:model-value="selectUnits"
      />
    </div>

    <YearSummary v-bind="data.totals" />

    <!-- Switching modes replaces everything below the controls without moving
         focus, which a screen reader has no other way to notice. -->
    <p role="status" class="sr-only">showing {{ modeLabel }}</p>

    <div role="region" :aria-label="`${modeLabel} view`">
      <LogView
        v-if="mode === 'log'"
        :months="logMonths"
        :has-more="hasMore"
        :loading="loading"
        :failed="failed"
        @open-photo="openPhoto"
        @load-more="loadMore"
      />
      <HighlightsView
        v-else-if="mode === 'highlights'"
        :months="data.highlightMonths"
      />
      <PrsView
        v-else
        :lists="records?.lists ?? []"
        :bests="records?.powerBests ?? []"
        :periods="periods"
        :period="recordPeriod"
        @update:period="recordPeriod = $event"
      />
    </div>

    <!-- CARTO's free basemap tier is granted in exchange for keeping its
         credit and OpenStreetMap's visible. A 150px card cannot hold them, so
         they sit once under the page instead. -->
    <p v-if="hasBasemap" class="text-[10px] text-foreground/50">
      maps
      <template v-for="(credit, index) in BASEMAP_CREDITS" :key="credit.href"
        ><template v-if="index > 0">, </template>&copy;
        <a
          :href="credit.href"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-accent"
          >{{ credit.label }}</a
        ></template
      >
    </p>

    <PhotoLightbox
      :photos="lightboxRide?.photos ?? []"
      :index="photoIndex"
      :ride-name="lightboxRide?.name ?? ''"
      :ride-url="lightboxRide?.stravaUrl"
      :open="lightboxRide !== null"
      @close="lightboxRide = null"
      @update:index="photoIndex = $event"
    />
  </div>
</template>
