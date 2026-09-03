<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { activity } from "./fixtures";
import PrsView from "./PrsView.vue";
import type { RankedList } from "@/activity/types";
import UnitsProvider from "./UnitsProvider.vue";

const periods = activity.records.map((entry) => entry.period);

function recordsFor(period: string): RecordPeriod {
  return (
    activity.records.find((entry) => entry.period === period) ??
    activity.records[0]!
  );
}

const controls: StoryControlSet = {
  period: { type: "select", title: "period", options: periods },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
};

function initState() {
  return { period: periods[0]!, units: "imperial" };
}
</script>

<template>
  <Story
    title="PRs view"
    group="cycling-views"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="PRs view" :init-state="initState">
      <template #default="{ state }">
        <div class="bg-background p-4 text-foreground">
          <PreviewControls :controls="controls" :state="state" />
          <UnitsProvider :units="state.units">
            <PrsView
              :lists="recordsFor(state.period).lists"
              :bests="recordsFor(state.period).powerBests"
              :periods="periods"
              :period="state.period"
              @update:period="state.period = $event"
            />
          </UnitsProvider>
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>

    <Variant title="Nothing recorded">
      <div class="bg-background p-4 text-foreground">
        <PrsView :lists="[]" :bests="[]" :periods="['2024']" period="2024" />
      </div>
    </Variant>
  </Story>
</template>

<docs lang="md">
# PRs view

Ranked lists and power bests for one period, with the period picker above them.

The picker is the view's own, so changing the period in the panel and tapping it
on the page are the same thing. Everything below it answers the period: 2025
carries fewer lists than 2026, and 2026 is the year with nothing measured behind
its ride average.
</docs>
