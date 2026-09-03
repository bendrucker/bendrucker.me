<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { logEvent } from "histoire/client";
import {
  bareRide,
  crowdedRide,
  epicRide,
  everydayRide,
  raceRide,
} from "./fixtures";
import RideCard from "./RideCard.vue";
import type { Ride } from "@/activity/types";
import type { Units } from "./types";
import UnitsProvider from "./UnitsProvider.vue";

const rides: Record<string, Ride> = {
  everyday: everydayRide,
  epic: epicRide,
  crowded: crowdedRide,
  race: raceRide,
  bare: bareRide,
  flat: { ...bareRide, elevationProfile: undefined },
};

const rideOptions = {
  everyday: "everyday ride",
  epic: "epic ride",
  crowded: "crowded ride",
  race: "race ride",
  bare: "bare ride",
  flat: "no elevation stream",
};

const controls: StoryControlSet = {
  ride: { type: "select", title: "ride", options: rideOptions },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
  width: { type: "slider", title: "card width", min: 280, max: 720 },
  mapWidth: { type: "slider", title: "map width", min: 96, max: 340 },
  mapHeight: { type: "slider", title: "map height", min: 80, max: 240 },
};

function initState() {
  return {
    ride: "everyday",
    units: "imperial" as Units,
    width: 358,
    mapWidth: 150,
    mapHeight: 140,
  };
}
</script>

<template>
  <Story
    title="Ride card"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
    :init-state="initState"
  >
    <Variant title="Ride card">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <UnitsProvider :units="state.units">
          <div :style="{ width: `${state.width}px`, maxWidth: '100%' }">
            <RideCard
              :ride="rides[state.ride]!"
              :map-width="state.mapWidth"
              :map-height="state.mapHeight"
              @open-photo="logEvent('openPhoto', { index: $event })"
            />
          </div>
        </UnitsProvider>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Ride card

One ride as it appears in the log.

Every case the card has to survive is a control rather than a variant. The
crowded ride is a long name with three badges and twelve photos, the bare ride
has no route, photos or badges, and the last entry drops the elevation stream.
Narrow the card width to the phone column the log actually renders in.
</docs>
