<script setup lang="ts">
import { months } from "./fixtures";
import UnitsProvider from "./UnitsProvider.vue";
import YearSummary from "./YearSummary.vue";

interface Totals {
  year: number;
  distanceMi: number;
  elevationFt: number;
  rideCount: number;
}

const season = months.reduce<Totals>(
  (running, month) => ({
    year: 2026,
    distanceMi: running.distanceMi + month.distanceMi,
    elevationFt: running.elevationFt + month.elevationFt,
    rideCount: running.rideCount + month.rideCount,
  }),
  { year: 2026, distanceMi: 0, elevationFt: 0, rideCount: 0 },
);

const totals: Record<string, Totals> = {
  season,
  sixFigure: {
    year: 2025,
    distanceMi: 14382.6,
    elevationFt: 1204877,
    rideCount: 1348,
  },
};

function initState() {
  return {
    totals: "season",
    note: "rides since may",
    units: "imperial",
    width: 380,
  };
}
</script>

<template>
  <Story
    title="Year summary"
    group="records"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
    :init-state="initState"
  >
    <Variant title="Year summary">
      <template #default="{ state }">
        <UnitsProvider :units="state.units">
          <div :style="{ width: `${state.width}px`, maxWidth: '100%' }">
            <YearSummary
              v-bind="totals[state.totals]!"
              :note="state.note || undefined"
            />
          </div>
        </UnitsProvider>
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.totals"
          title="totals"
          :options="{
            season: 'a season',
            sixFigure: 'six-figure totals',
          }"
        />
        <HstText v-model="state.note" title="note" />
        <HstSelect
          v-model="state.units"
          title="units"
          :options="['imperial', 'metric']"
        />
        <HstSlider v-model="state.width" title="width" :min="240" :max="720" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Year summary

The headline totals above the log: distance, climbing, rides.

Clear the note to see the summary without its qualifier. The six-figure totals
are what the numbers look like once a full year of climbing has accumulated, and
the width slider is where they start to collide.
</docs>
