<script setup lang="ts">
import { computed, ref } from "vue";
import HighlightsView from "./HighlightsView.vue";
import LogView from "./LogView.vue";
import PhotoLightbox from "./PhotoLightbox.vue";
import PrsView from "./PrsView.vue";
import SegmentedControl from "./SegmentedControl.vue";
import type { CyclingActivityData, Ride, Units, ViewMode } from "./types";
import { provideUnits } from "./useUnits";
import YearSummary from "./YearSummary.vue";

const props = defineProps<{ data: CyclingActivityData }>();

const mode = defineModel<ViewMode>("mode", { default: "log" });
const units = defineModel<Units>("units", { default: "imperial" });
const period = defineModel<string>("period", { default: "all" });

provideUnits(units);

const MODES: { value: ViewMode; label: string }[] = [
  { value: "log", label: "log" },
  { value: "highlights", label: "highlights" },
  { value: "prs", label: "prs" },
];

const UNITS: { value: Units; label: string }[] = [
  { value: "imperial", label: "mi" },
  { value: "metric", label: "km" },
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

/** A period the data no longer carries falls back to the first one offered. */
const activePeriod = computed(() =>
  props.data.recordPeriods.includes(period.value)
    ? period.value
    : (props.data.recordPeriods[0] ?? ""),
);

const records = computed(() => props.data.records[activePeriod.value] ?? []);

const modeLabel = computed(
  () => MODES.find((option) => option.value === mode.value)?.label ?? "",
);

const lightboxRide = ref<Ride | null>(null);
const photoIndex = ref(0);

function openPhoto(ride: Ride, index: number) {
  lightboxRide.value = ride;
  photoIndex.value = index;
}
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

    <div role="region" :aria-label="`${modeLabel} view`">
      <LogView
        v-if="mode === 'log'"
        :months="data.months"
        @open-photo="openPhoto"
      />
      <HighlightsView
        v-else-if="mode === 'highlights'"
        :months="data.highlightMonths"
      />
      <PrsView
        v-else
        :lists="records"
        :bests="data.powerBests"
        :periods="data.recordPeriods"
        :period="activePeriod"
        :power-note="data.powerNote"
        @update:period="period = $event"
      />
    </div>

    <PhotoLightbox
      :photos="lightboxRide?.photos ?? []"
      :index="photoIndex"
      :ride-name="lightboxRide?.name ?? ''"
      :ride-url="lightboxRide?.stravaUrl ?? ''"
      :open="lightboxRide !== null"
      @close="lightboxRide = null"
      @update:index="photoIndex = $event"
    />
  </div>
</template>
