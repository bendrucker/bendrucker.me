<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import type { RideMedia } from "@/activity/types";
import {
  crowdedRide,
  epicRide,
  raceRide,
  travelRide,
} from "@/components/cycling/fixtures";
import RideGallery from "./RideGallery.vue";

const mediaSets: Record<string, RideMedia[]> = {
  one: raceRide.media,
  three: epicRide.media,
  video: travelRide.media,
  twelve: crowdedRide.media,
};

const controls: StoryControlSet = {
  media: {
    type: "select",
    title: "media",
    options: {
      one: "one photo",
      three: "three photos",
      video: "a video first",
      twelve: "twelve photos",
    },
  },
};

function initState() {
  return { media: "video" };
}
</script>

<template>
  <Story
    title="Ride gallery"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Ride gallery" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div class="max-w-[600px] overflow-hidden px-4 cat-rides">
          <RideGallery
            :media="mediaSets[state.media]!"
            :ride-name="travelRide.name"
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
# Ride gallery

A ride page's photos and videos, each at its own shape. On a phone they are a
210px strip that bleeds to the screen's edge and snaps. From the desktop
breakpoint up the same list wraps into a justified gallery, rows sharing a
height. A shot opens the black viewer, which pages with a swipe or the arrow
keys and returns focus to the shot that opened it.

Stories have no worker to cut previews, so the shots draw the fixtures' own
thumbnails. Open the full-width link on a desktop to see the gallery.
</docs>
