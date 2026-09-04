<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import CyclingActivity from "./CyclingActivity.vue";
import { activity } from "./fixtures";
import type { CyclingActivityData } from "@/activity/types";

/** A first-ride-of-the-year account: totals, but nothing ranked or notable. */
const newcomer: CyclingActivityData = {
  ...activity,
  totals: {
    year: 2026,
    distanceMi: 18.4,
    elevationFt: 620,
    rideCount: 1,
  },
  months: activity.months.slice(0, 1),
  highlightMonths: [],
  records: [{ period: "2026", lists: [], powerBests: [] }],
};

const datasets: Record<string, CyclingActivityData> = {
  season: activity,
  newcomer,
};

const controls: StoryControlSet = {
  data: {
    type: "select",
    title: "data",
    options: {
      season: "a full season",
      newcomer: "one ride, nothing ranked",
    },
  },
  mode: {
    type: "select",
    title: "mode",
    options: ["log", "highlights", "prs"],
  },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
  recordPeriod: {
    type: "select",
    title: "record period",
    options: {
      all: "all",
      "2026": "2026",
      "2025": "2025",
      "1997": "1997 (not in the data)",
    },
  },
};

function initState() {
  return {
    data: "season",
    mode: "log",
    units: "imperial",
    recordPeriod: "all",
  };
}
</script>

<template>
  <!-- Single layout, because the month rail is fixed: in a grid cell it would
       pin itself to the Histoire window and float over the UI. -->
  <Story
    title="Activity page"
    group="cycling-views"
    auto-props-disabled
    responsive-disabled
    :layout="{ type: 'single', iframe: true }"
    :init-state="initState"
  >
    <Variant title="Activity page">
      <template #default="{ state }">
        <div class="min-h-screen bg-background p-4 pb-[60vh]">
          <PreviewControls :controls="controls" :state="state" />
          <CyclingActivity
            v-model:mode="state.mode"
            v-model:units="state.units"
            v-model:record-period="state.recordPeriod"
            :data="datasets[state.data]!"
          />
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Activity page

The whole cycling page: year totals, the mode tabs, and whichever view they
select. Mode and units are two-way, so tapping the page's own controls moves the
panel and vice versa.

Set the record period to 1997 to watch the view fall back to the first period the
data carries and correct the model to match.
</docs>
