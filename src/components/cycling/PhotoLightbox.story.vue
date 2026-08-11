<script setup lang="ts">
import { ref } from "vue";
import { crowdedRide, raceRide, travelRide } from "./fixtures";
import PhotoLightbox from "./PhotoLightbox.vue";
import PhotoStrip from "./PhotoStrip.vue";
import type { RidePhoto } from "./types";

const photoSets: Record<string, RidePhoto[]> = {
  five: travelRide.photos,
  two: travelRide.photos.slice(0, 2),
  one: raceRide.photos,
  none: [],
};

const fromStrip = ref(0);
const fromStripOpen = ref(false);

function openStrip(index: number) {
  fromStrip.value = index;
  fromStripOpen.value = true;
}

function initState() {
  return { photos: "five", index: 2, open: false };
}
</script>

<template>
  <Story
    title="Photo lightbox"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 380 }"
  >
    <Variant title="Photo lightbox" :init-state="initState">
      <template #default="{ state }">
        <button
          type="button"
          class="rounded border border-border px-2 py-1 text-[11px]"
          @click="state.open = true"
        >
          open at photo {{ state.index + 1 }} of
          {{ photoSets[state.photos]!.length }}
        </button>
        <PhotoLightbox
          v-model:index="state.index"
          :photos="photoSets[state.photos]!"
          :ride-name="travelRide.name"
          :ride-url="travelRide.stravaUrl"
          :open="state.open"
          @close="state.open = false"
        />
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.photos"
          title="photos"
          :options="{
            five: 'five photos',
            two: 'two photos',
            one: 'one photo, so no arrows',
            none: 'none left',
          }"
        />
        <HstSlider v-model="state.index" title="index" :min="0" :max="4" />
        <HstCheckbox v-model="state.open" title="open" />
      </template>
    </Variant>

    <Variant title="Opened from a strip">
      <PhotoStrip :photos="crowdedRide.photos" @open="openStrip" />
      <PhotoLightbox
        v-model:index="fromStrip"
        :photos="crowdedRide.photos"
        :ride-name="crowdedRide.name"
        :ride-url="crowdedRide.stravaUrl"
        :open="fromStripOpen"
        @close="fromStripOpen = false"
      />
    </Variant>
  </Story>
</template>

<docs lang="md">
# Photo lightbox

Full-screen photo viewing, opened from a ride's strip.

Open it, then cut the photo count from the panel while it is still open: the
index has to survive the array shrinking under it, including to nothing. The
index slider reaches past the shorter sets on purpose.
</docs>
