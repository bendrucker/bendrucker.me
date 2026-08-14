<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
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

const controls: StoryControlSet = {
  totals: {
    type: "select",
    title: "totals",
    options: { season: "a season", sixFigure: "six-figure totals" },
  },
  note: { type: "text", title: "note" },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
  width: { type: "slider", title: "width", min: 240, max: 720 },
};

function initState() {
  return {
    totals: "season",
    note: "rides since may",
    units: "imperial",
    width: 358,
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
        <PreviewControls :controls="controls" :state="state" />
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
        <PanelControls :controls="controls" :state="state" />
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
