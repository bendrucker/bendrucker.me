<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import ElevationProfile from "./ElevationProfile.vue";
import {
  bareRide,
  epicRide,
  everydayRide,
  raceRide,
  travelRide,
  winterRide,
} from "./fixtures";
import { encodeProfile } from "@/activity/track";

const sampleSets: Record<string, string> = {
  hilly: epicRide.elevationProfile ?? "",
  flat: raceRide.elevationProfile ?? "",
  short: bareRide.elevationProfile ?? "",
  one: encodeProfile([0.7]),
  two: encodeProfile([0.2, 0.85]),
  none: "",
};

const scale = [raceRide, winterRide, travelRide, everydayRide, epicRide].map(
  (ride) => ({
    name: ride.name,
    feetPerMile: Math.round((ride.elevationFt ?? 0) / (ride.distanceMi ?? 1)),
    profile: ride.elevationProfile ?? "",
  }),
);

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
        <ElevationProfile :profile="sampleSets[state.samples]!" />
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>

    <Variant title="Across the scale">
      <ul class="flex flex-col gap-2">
        <li
          v-for="row in scale"
          :key="row.name"
          class="relative min-h-18 overflow-hidden rounded-lg border border-border"
        >
          <ElevationProfile
            class="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            :profile="row.profile"
          />
          <p class="relative truncate p-2 text-[11px] text-foreground/70">
            {{ row.name }} · {{ row.feetPerMile }} ft/mi
          </p>
        </li>
      </ul>
    </Variant>

    <Variant title="Behind card text">
      <div class="relative overflow-hidden rounded-lg border border-border p-3">
        <ElevationProfile
          class="pointer-events-none absolute inset-x-0 bottom-0 h-16"
          :profile="epicRide.elevationProfile ?? ''"
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

The wash of climbing behind a ride card. A sample is the share of the chart's
height that point of the ride stands at, so the component only paints: how much
of the box a ride earns is decided upstream by `relief`, from its climbing per
mile. A flat commute keeps a thin horizon and a morning of hill repeats fills
three quarters of the box.

"Across the scale" is that spread on one screen, from the flattest fixture ride
to the hilliest.

One and two samples are the cases with no width to interpolate across. An empty
list should draw nothing rather than a flat line.
</docs>
