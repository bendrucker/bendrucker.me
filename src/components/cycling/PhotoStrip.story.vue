<script setup lang="ts">
import { logEvent } from "histoire/client";
import {
  bareRide,
  crowdedRide,
  epicRide,
  raceRide,
  travelRide,
} from "./fixtures";
import PhotoStrip from "./PhotoStrip.vue";
import type { RidePhoto } from "./types";

const photoSets: Record<string, RidePhoto[]> = {
  one: raceRide.photos,
  three: epicRide.photos,
  four: crowdedRide.photos,
  five: travelRide.photos,
  none: bareRide.photos,
};

function initState() {
  return { photos: "three", width: 380 };
}
</script>

<template>
  <Story
    title="Photo strip"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 380 }"
    :init-state="initState"
  >
    <Variant title="Photo strip">
      <template #default="{ state }">
        <div :style="{ width: `${state.width}px`, maxWidth: '100%' }">
          <PhotoStrip
            :photos="photoSets[state.photos]!"
            @open="logEvent('open', { index: $event })"
          />
        </div>
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.photos"
          title="photos"
          :options="{
            one: 'one photo',
            three: 'three photos',
            four: 'four photos',
            five: 'five photos',
            none: 'no photos',
          }"
        />
        <HstSlider v-model="state.width" title="width" :min="96" :max="380" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Photo strip

The row of thumbnails on a ride card.

Narrow the width until the row wraps. Tapping a thumbnail logs the index it would
open in the lightbox.
</docs>
