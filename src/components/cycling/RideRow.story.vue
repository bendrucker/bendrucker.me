<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { rides } from "./fixtures";
import RideRow from "./RideRow.vue";
import UnitsProvider from "./UnitsProvider.vue";
import type { Units } from "./types";

const controls: StoryControlSet = {
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
  width: { type: "slider", title: "width", min: 320, max: 768 },
};

function initState() {
  return { units: "imperial" as Units, width: 768 };
}
</script>

<template>
  <Story
    title="Ride row"
    group="ride"
    auto-props-disabled
    responsive-disabled
    :layout="{ type: 'single' }"
  >
    <Variant title="In a list" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <UnitsProvider :units="state.units">
          <ul
            role="list"
            class="border-t border-muted"
            :style="{ width: `${state.width}px`, maxWidth: '100%' }"
          >
            <li v-for="ride in rides" :key="ride.id">
              <RideRow :ride="ride" />
            </li>
          </ul>
        </UnitsProvider>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Ride row

A ride as one line in a list, for pages where a card is too much. Every
fixture is in the list, so the long name, the ride with no Strava link, and
the one with no stats are all on screen. Narrow the width to see the name
truncate ahead of the stats.
</docs>
