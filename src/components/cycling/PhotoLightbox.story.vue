<script setup lang="ts">
import { ref } from "vue";
import { crowdedRide, raceRide, travelRide } from "./fixtures";
import PhotoLightbox from "./PhotoLightbox.vue";
import PhotoStrip from "./PhotoStrip.vue";

const middle = ref(2);
const middleOpen = ref(false);

const first = ref(0);
const firstOpen = ref(false);

const last = ref(travelRide.photos.length - 1);
const lastOpen = ref(false);

const single = ref(0);
const singleOpen = ref(false);

const fromStrip = ref(0);
const fromStripOpen = ref(false);

function openStrip(index: number) {
  fromStrip.value = index;
  fromStripOpen.value = true;
}

const shrinking = ref(3);
const shrinkingOpen = ref(false);
const shrinkingPhotos = ref(travelRide.photos);
</script>

<template>
  <Story title="Cycling/Photo lightbox" :layout="{ type: 'grid', width: 380 }">
    <Variant title="Middle photo">
      <button
        type="button"
        class="rounded border border-border px-2 py-1 text-[11px]"
        @click="middleOpen = true"
      >
        open at photo {{ middle + 1 }} of {{ travelRide.photos.length }}
      </button>
      <PhotoLightbox
        v-model:index="middle"
        :photos="travelRide.photos"
        :ride-name="travelRide.name"
        :ride-url="travelRide.stravaUrl"
        :open="middleOpen"
        @close="middleOpen = false"
      />
    </Variant>

    <Variant title="First photo, wraps backwards">
      <button
        type="button"
        class="rounded border border-border px-2 py-1 text-[11px]"
        @click="firstOpen = true"
      >
        open at the first photo
      </button>
      <PhotoLightbox
        v-model:index="first"
        :photos="travelRide.photos"
        :ride-name="travelRide.name"
        :ride-url="travelRide.stravaUrl"
        :open="firstOpen"
        @close="firstOpen = false"
      />
    </Variant>

    <Variant title="Last photo, wraps forwards">
      <button
        type="button"
        class="rounded border border-border px-2 py-1 text-[11px]"
        @click="lastOpen = true"
      >
        open at the last photo
      </button>
      <PhotoLightbox
        v-model:index="last"
        :photos="travelRide.photos"
        :ride-name="travelRide.name"
        :ride-url="travelRide.stravaUrl"
        :open="lastOpen"
        @close="lastOpen = false"
      />
    </Variant>

    <Variant title="Single photo, no arrows">
      <button
        type="button"
        class="rounded border border-border px-2 py-1 text-[11px]"
        @click="singleOpen = true"
      >
        open the only photo
      </button>
      <PhotoLightbox
        v-model:index="single"
        :photos="raceRide.photos"
        :ride-name="raceRide.name"
        :ride-url="raceRide.stravaUrl"
        :open="singleOpen"
        @close="singleOpen = false"
      />
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

    <Variant title="Photos removed while open">
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded border border-border px-2 py-1 text-[11px]"
          @click="
            shrinkingPhotos = travelRide.photos;
            shrinking = 3;
            shrinkingOpen = true;
          "
        >
          open at photo 4
        </button>
        <button
          type="button"
          class="rounded border border-border px-2 py-1 text-[11px]"
          @click="shrinkingPhotos = travelRide.photos.slice(0, 2)"
        >
          drop to 2 photos
        </button>
        <button
          type="button"
          class="rounded border border-border px-2 py-1 text-[11px]"
          @click="shrinkingPhotos = []"
        >
          drop to none
        </button>
      </div>
      <p class="mt-2 text-[11px] text-foreground/70">
        index {{ shrinking }} · {{ shrinkingPhotos.length }} photos ·
        {{ shrinkingOpen ? "open" : "closed" }}
      </p>
      <PhotoLightbox
        v-model:index="shrinking"
        :photos="shrinkingPhotos"
        :ride-name="travelRide.name"
        :ride-url="travelRide.stravaUrl"
        :open="shrinkingOpen"
        @close="shrinkingOpen = false"
      />
    </Variant>
  </Story>
</template>
