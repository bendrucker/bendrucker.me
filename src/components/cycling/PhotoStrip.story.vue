<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { logEvent } from "histoire/client";
import {
  bareRide,
  crowdedRide,
  epicRide,
  raceRide,
  travelRide,
} from "./fixtures";
import PhotoStrip from "./PhotoStrip.vue";
import type { RidePhoto } from "@/activity/types";

const photoSets: Record<string, RidePhoto[]> = {
  one: raceRide.photos,
  three: epicRide.photos,
  four: crowdedRide.photos,
  five: travelRide.photos,
  none: bareRide.photos,
};

const controls: StoryControlSet = {
  photos: {
    type: "select",
    title: "photos",
    options: {
      one: "one photo",
      three: "three photos",
      four: "four photos",
      five: "five photos",
      none: "no photos",
    },
  },
  width: { type: "slider", title: "width", min: 96, max: 340 },
};

function initState() {
  return { photos: "three", width: 340 };
}
</script>

<template>
  <Story
    title="Photo strip"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
    :init-state="initState"
  >
    <Variant title="Photo strip">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div :style="{ width: `${state.width}px`, maxWidth: '100%' }">
          <PhotoStrip
            :photos="photoSets[state.photos]!"
            @open="logEvent('open', { index: $event })"
          />
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
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
