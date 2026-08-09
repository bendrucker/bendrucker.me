<script setup lang="ts">
import { ref } from "vue";
import {
  bareRide,
  crowdedRide,
  epicRide,
  everydayRide,
  raceRide,
} from "./fixtures";
import RideCard from "./RideCard.vue";

const lastPhoto = ref<number | null>(null);
</script>

<template>
  <Story title="Cycling/Ride card" :layout="{ type: 'grid', width: 720 }">
    <Variant title="Everyday ride">
      <RideCard :ride="everydayRide" />
    </Variant>

    <Variant title="Epic ride">
      <RideCard :ride="epicRide" />
    </Variant>

    <Variant title="Crowded ride">
      <RideCard :ride="crowdedRide" />
    </Variant>

    <Variant title="Bare ride">
      <RideCard :ride="bareRide" />
    </Variant>

    <Variant title="Race ride">
      <RideCard :ride="raceRide" />
    </Variant>

    <Variant title="Narrow" :layout="{ type: 'grid', width: 340 }">
      <RideCard :ride="crowdedRide" />
    </Variant>

    <Variant title="Wide map">
      <RideCard :ride="epicRide" :map-width="220" :map-height="180" />
    </Variant>

    <Variant title="Photo events">
      <RideCard :ride="epicRide" @open-photo="lastPhoto = $event" />
      <p class="mt-2 text-[11px] text-foreground/60">
        last openPhoto: {{ lastPhoto ?? "none" }}
      </p>
    </Variant>
  </Story>
</template>
