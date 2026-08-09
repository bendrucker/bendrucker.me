<script setup lang="ts">
import { ref } from "vue";
import {
  bareRide,
  crowdedRide,
  epicRide,
  raceRide,
  travelRide,
} from "./fixtures";
import PhotoStrip from "./PhotoStrip.vue";

const opened = ref<number | null>(null);
</script>

<template>
  <Story title="Cycling/Photo strip" :layout="{ type: 'grid', width: 420 }">
    <Variant title="Single photo">
      <PhotoStrip :photos="raceRide.photos" />
    </Variant>

    <Variant title="Several photos">
      <PhotoStrip :photos="epicRide.photos" />
    </Variant>

    <Variant title="Wrapping row">
      <div class="w-32">
        <PhotoStrip :photos="travelRide.photos" />
      </div>
    </Variant>

    <Variant title="Empty">
      <PhotoStrip :photos="bareRide.photos" />
    </Variant>

    <Variant title="Interactive">
      <PhotoStrip :photos="crowdedRide.photos" @open="opened = $event" />
      <p class="pt-2 text-[11px] text-foreground/60">
        {{ opened === null ? "no photo opened yet" : `opened index ${opened}` }}
      </p>
    </Variant>
  </Story>
</template>
