<script setup lang="ts">
import CyclingActivity from "./CyclingActivity.vue";
import { activity } from "./fixtures";
import type { CyclingActivityData } from "./types";

/** A first-ride-of-the-year account: totals, but nothing ranked or notable. */
const newcomer: CyclingActivityData = {
  ...activity,
  totals: {
    year: 2026,
    distanceMi: 18.4,
    elevationFt: 620,
    rideCount: 1,
    note: "ride since january",
  },
  months: activity.months.slice(0, 1),
  highlightMonths: [],
  records: {},
  recordPeriods: ["2026"],
  powerBests: [],
  powerNote: undefined,
};
</script>

<template>
  <!-- Single layout, because the month rail is fixed: in a grid cell it would
       pin itself to the Histoire window and float over the UI. -->
  <Story
    title="Cycling/Activity page"
    :layout="{ type: 'single', iframe: true }"
  >
    <Variant title="Log">
      <div class="min-h-screen bg-background p-4 pb-[60vh]">
        <CyclingActivity :data="activity" />
      </div>
    </Variant>

    <Variant title="Highlights">
      <div class="min-h-screen bg-background p-4">
        <CyclingActivity :data="activity" mode="highlights" />
      </div>
    </Variant>

    <Variant title="PRs">
      <div class="min-h-screen bg-background p-4">
        <CyclingActivity :data="activity" mode="prs" />
      </div>
    </Variant>

    <Variant title="Metric">
      <div class="min-h-screen bg-background p-4 pb-[60vh]">
        <CyclingActivity :data="activity" units="metric" />
      </div>
    </Variant>

    <Variant title="Barely any data">
      <div class="min-h-screen bg-background p-4">
        <CyclingActivity :data="newcomer" mode="highlights" />
      </div>
    </Variant>
  </Story>
</template>
