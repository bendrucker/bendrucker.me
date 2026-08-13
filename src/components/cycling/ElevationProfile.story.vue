<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import ElevationProfile from "./ElevationProfile.vue";
import { bareRide, epicRide, raceRide } from "./fixtures";

const sampleSets: Record<string, number[]> = {
  hilly: epicRide.elevationProfile ?? [],
  flat: raceRide.elevationProfile ?? [],
  short: bareRide.elevationProfile ?? [],
  one: [0.7],
  two: [0.2, 0.85],
  none: [],
};

const controls: StoryControlSet = {
  samples: {
    type: "select",
    title: "samples",
    options: {
      hilly: "a hilly ride",
      flat: "a flat ride",
      short: "a short ride",
      one: "one sample",
      two: "two samples",
      none: "no samples",
    },
  },
};

function initState() {
  return { samples: "hilly" };
}
</script>

<template>
  <Story
    title="Elevation profile"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Elevation profile" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <ElevationProfile :samples="sampleSets[state.samples]!" />
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>

    <Variant title="Behind card text">
      <div class="relative overflow-hidden rounded-lg border border-border p-3">
        <ElevationProfile
          class="pointer-events-none absolute inset-x-0 bottom-0 h-12"
          :samples="epicRide.elevationProfile ?? []"
        />
        <p class="relative text-[13px] font-bold">{{ epicRide.name }}</p>
        <p class="relative text-[11px] text-foreground/70">
          the ride card stacks its text over the wash
        </p>
      </div>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Elevation profile

The wash of climbing behind a ride card, drawn from a normalized sample list.

One and two samples are the cases with no width to interpolate across. An empty
list should draw nothing rather than a flat line.
</docs>
