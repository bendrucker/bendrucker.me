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

const measuredBests: PowerBest[] = powerBests.map((best) => ({
  ...best,
  watts: best.watts ?? measuredWatts[best.id] ?? null,
}));

const unmeasuredBests: PowerBest[] = powerBests.map((best) => ({
  ...best,
  watts: null,
}));
</script>

<template>
  <Story title="Cycling/Power panel" :layout="{ type: 'grid', width: 380 }">
    <Variant title="Mostly unmeasured">
      <PowerPanel :bests="powerBests" />
    </Variant>

    <Variant title="Fully measured">
      <PowerPanel
        :bests="measuredBests"
        source-note="from ride power streams"
      />
    </Variant>

    <Variant title="No power data at all">
      <PowerPanel
        :bests="unmeasuredBests"
        source-note="no power meter on these rides"
      />
    </Variant>

    <Variant title="No durations">
      <PowerPanel :bests="[]" />
    </Variant>
  </Story>
</template>
