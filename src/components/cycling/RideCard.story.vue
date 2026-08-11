<script setup lang="ts">
import { logEvent } from "histoire/client";
import {
  bareRide,
  crowdedRide,
  epicRide,
  everydayRide,
  raceRide,
} from "./fixtures";
import RideCard from "./RideCard.vue";
import type { Ride, Units } from "./types";
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

function initState() {
  return {
    ride: "everyday",
    units: "imperial" as Units,
    width: 380,
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
        <HstSelect v-model="state.ride" title="ride" :options="rideOptions" />
        <HstSelect
          v-model="state.units"
          title="units"
          :options="['imperial', 'metric']"
        />
        <HstSlider
          v-model="state.width"
          title="card width"
          :min="280"
          :max="720"
        />
        <HstSlider
          v-model="state.mapWidth"
          title="map width"
          :min="96"
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
# Ride card

One ride as it appears in the log.

Every case the card has to survive is a control rather than a variant. The
crowded ride is a long name with three badges and four photos, the bare ride has
no route, photos or badges, and the last entry drops the elevation stream.
Narrow the card width to the phone column the log actually renders in.
</docs>
