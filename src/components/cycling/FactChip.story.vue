<script setup lang="ts">
import { bareRide, crowdedRide, epicRide, raceRide } from "./fixtures";
import FactChip from "./FactChip.vue";
import type { RideFact } from "./types";

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

function initState() {
  return { facts: "two", width: 380 };
}
</script>

<template>
  <Story
    title="Fact chip"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 380 }"
    :init-state="initState"
  >
    <Variant title="Fact chip">
      <template #default="{ state }">
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
        <HstSelect
          v-model="state.facts"
          title="facts"
          :options="{
            one: 'one fact',
            two: 'two facts',
            three: 'three facts',
            long: 'one long fact',
            none: 'no facts',
          }"
        />
        <HstSlider v-model="state.width" title="width" :min="120" :max="380" />
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
