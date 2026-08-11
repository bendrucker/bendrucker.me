<script setup lang="ts">
import { powerBests } from "./fixtures";
import PowerPanel from "./PowerPanel.vue";
import type { PowerBest } from "./types";

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

function initState() {
  return { bests: "partial", note: "from rides with a power meter" };
}
</script>

<template>
  <Story
    title="Power panel"
    group="records"
    auto-props-disabled
    :layout="{ type: 'grid', width: 380 }"
    :init-state="initState"
  >
    <Variant title="Power panel">
      <template #default="{ state }">
        <PowerPanel
          :bests="bestSets[state.bests]!"
          :source-note="state.note || undefined"
        />
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.bests"
          title="bests"
          :options="{
            partial: 'ride average only',
            measured: 'all durations',
            unmeasured: 'nothing measured',
            none: 'no durations at all',
          }"
        />
        <HstText v-model="state.note" title="source note" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Power panel

Best average watts over a set of durations.

Most durations have no number behind them until a ride with a power meter fills
them in, so the partial case is the ordinary one. Clear the source note to see
the panel without its footnote.
</docs>
