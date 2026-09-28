<script setup lang="ts">
import { defineAsyncComponent, ref } from "vue";
import type { RideMedia } from "@/activity/types";
import MediaStrip from "@/components/cycling/MediaStrip.vue";

defineProps<{
  media: RideMedia[];
  rideName: string;
}>();

// The viewer and the dialog primitives under it are a fifth of the page's
// script, and most readers never open a shot. They load on the first tap.
const MediaLightbox = defineAsyncComponent(
  async () => import("@/components/cycling/MediaLightbox.vue"),
);

const open = ref(false);
const opened = ref(false);
const index = ref(0);

function show(at: number) {
  index.value = at;
  open.value = true;
  opened.value = true;
}
</script>

<template>
  <!-- The island a ride page hydrates: the shots and the black viewer they
       open. The strip, the gallery, and the viewer's keyboard handling are
       the cycling log's own components. -->
  <div>
    <MediaStrip :media="media" size="shot" @open="show" />
    <MediaLightbox
      v-if="opened"
      v-model:index="index"
      :media="media"
      :ride-name="rideName"
      :open="open"
      tone="black"
      @close="open = false"
    />
  </div>
</template>
