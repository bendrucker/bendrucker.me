<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { bareRide, crowdedRide, epicRide, raceRide } from "./fixtures";
import FactChip from "./FactChip.vue";
import type { RideFact } from "@/activity/types";

const factSets: Record<string, RideFact[]> = {
  one: raceRide.facts,
  two: epicRide.facts,
  three: crowdedRide.facts,
  long: [
    {
      id: "long",
      icon: "trending-up",
      label: "3,204 ft climb · 8.4% average grade over 7.1 miles · 41 min",
    },
  ],
  none: bareRide.facts,
};

const controls: StoryControlSet = {
  facts: {
    type: "select",
    title: "facts",
    options: {
      one: "one fact",
      two: "two facts",
      three: "three facts",
      long: "one long fact",
      none: "no facts",
    },
  },
  width: { type: "slider", title: "width", min: 120, max: 340 },
};

function initState() {
  return { facts: "two", width: 340 };
}
</script>

<template>
  <Story
    title="Fact chip"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
    :init-state="initState"
  >
    <Variant title="Fact chip">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <ul
          class="flex flex-wrap gap-1.5"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <li v-for="fact in factSets[state.facts]!" :key="fact.id">
            <FactChip :fact="fact" />
          </li>
        </ul>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Fact chip

The small annotations under a ride: a climb, a calorie count, an average speed.

Chips are laid out by the ride card, so the row here is the card's. Narrow the
width to see where a long label wraps against a short one.
</docs>
