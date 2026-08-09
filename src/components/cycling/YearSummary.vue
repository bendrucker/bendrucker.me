<script setup lang="ts">
import StatValue from "./StatValue.vue";
import { useUnits } from "./useUnits";

defineProps<{
  year: number;
  distanceMi: number;
  elevationFt: number;
  rideCount: number;
  note?: string;
}>();

const { distanceUnit, elevationUnit, formatDistance, formatElevation } =
  useUnits();
</script>

<template>
  <div
    class="flex flex-wrap items-baseline gap-x-6 gap-y-3 rounded-lg border border-border px-4 py-3"
  >
    <span
      class="font-sans text-[26px] leading-none font-extrabold tracking-tight"
    >
      {{ year }}
    </span>
    <StatValue
      :value="formatDistance(distanceMi)"
      :unit="distanceUnit"
      size="lg"
      label="distance"
    />
    <StatValue
      :value="formatElevation(elevationFt)"
      :unit="elevationUnit"
      size="lg"
      label="climbing"
    />
    <StatValue
      :value="rideCount.toLocaleString('en-US')"
      :unit="note ?? 'rides'"
      size="lg"
    />
  </div>
</template>
