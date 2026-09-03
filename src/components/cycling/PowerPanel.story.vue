<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { powerBests } from "./fixtures";
import PowerPanel from "./PowerPanel.vue";
import type { PowerBest } from "@/activity/types";

const measuredWatts: Record<string, number> = {
  "1m": 412,
  "5m": 341,
  "20m": 297,
  "1h": 264,
};

const bestSets: Record<string, PowerBest[]> = {
  partial: powerBests,
  measured: powerBests.map((best) => ({
    ...best,
    watts: best.watts ?? measuredWatts[best.id] ?? null,
  })),
  unmeasured: powerBests.map((best) => ({ ...best, watts: null })),
  none: [],
};

const controls: StoryControlSet = {
  bests: {
    type: "select",
    title: "bests",
    options: {
      partial: "ride average only",
      measured: "all durations",
      unmeasured: "nothing measured",
      none: "no durations at all",
    },
  },
};

function initState() {
  return { bests: "partial" };
}
</script>

<template>
  <Story
    title="Power panel"
    group="records"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
    :init-state="initState"
  >
    <Variant title="Power panel">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <PowerPanel :bests="bestSets[state.bests]!" />
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Power panel

Best average watts over a set of durations.

Most durations have no number behind them until a ride with a power meter fills
them in, so the partial case is the ordinary one.
</docs>
