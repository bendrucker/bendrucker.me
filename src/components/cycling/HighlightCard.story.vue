<script setup lang="ts">
import { bareRide, crowdedRide, highlights } from "./fixtures";
import HighlightCard from "./HighlightCard.vue";
import type { Highlight } from "./types";
import UnitsProvider from "./UnitsProvider.vue";

const cases: Record<string, Highlight> = {
  distance: highlights[0]!,
  elevation: highlights[1]!,
  duration: highlights[2]!,
  longName: {
    ride: crowdedRide,
    badge: crowdedRide.badges[0]!,
    metric: "distance",
  },
  noRoute: {
    ride: bareRide,
    badge: { kind: "longest", icon: "ruler", label: "longest" },
    metric: "duration",
  },
};

function initState() {
  return {
    highlight: "distance",
    units: "imperial",
    mapWidth: 260,
    mapHeight: 130,
  };
}
</script>

<template>
  <Story
    title="Highlight card"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 380 }"
    :init-state="initState"
  >
    <Variant title="Highlight card">
      <template #default="{ state }">
        <UnitsProvider :units="state.units">
          <HighlightCard
            :highlight="cases[state.highlight]!"
            :map-width="state.mapWidth"
            :map-height="state.mapHeight"
          />
        </UnitsProvider>
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.highlight"
          title="highlight"
          :options="{
            distance: 'distance',
            elevation: 'elevation',
            duration: 'duration',
            longName: 'a long name',
            noRoute: 'no route',
          }"
        />
        <HstSelect
          v-model="state.units"
          title="units"
          :options="['imperial', 'metric']"
        />
        <HstSlider
          v-model="state.mapWidth"
          title="map width"
          :min="120"
          :max="340"
        />
        <HstSlider
          v-model="state.mapHeight"
          title="map height"
          :min="80"
          :max="240"
        />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Highlight card

One notable ride, headed by the metric that made it notable.

The metric drives which stat leads the card, so walk the three of them. The map
sliders start at the component's own defaults.
</docs>
