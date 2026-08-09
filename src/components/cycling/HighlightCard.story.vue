<script setup lang="ts">
import { bareRide, crowdedRide, highlights } from "./fixtures";
import HighlightCard from "./HighlightCard.vue";
import type { Highlight } from "./types";

const distanceHighlight = highlights[0]!;
const elevationHighlight = highlights[1]!;
const durationHighlight = highlights[2]!;

const crowdedHighlight: Highlight = {
  ride: crowdedRide,
  badge: crowdedRide.badges[0]!,
  metric: "distance",
};

const bareHighlight: Highlight = {
  ride: bareRide,
  badge: { kind: "longest", label: "→ longest" },
  metric: "duration",
};
</script>

<template>
  <Story title="Cycling/Highlight card" :layout="{ type: 'grid', width: 300 }">
    <Variant title="Distance">
      <HighlightCard :highlight="distanceHighlight" />
    </Variant>

    <Variant title="Elevation">
      <HighlightCard :highlight="elevationHighlight" />
    </Variant>

    <Variant title="Duration">
      <HighlightCard :highlight="durationHighlight" />
    </Variant>

    <Variant title="Long name">
      <HighlightCard :highlight="crowdedHighlight" />
    </Variant>

    <Variant title="No route">
      <HighlightCard :highlight="bareHighlight" />
    </Variant>
  </Story>
</template>
