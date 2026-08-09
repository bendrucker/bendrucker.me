<script setup lang="ts">
import StatValue from "./StatValue.vue";
import { useUnits } from "./useUnits";

withDefaults(
  defineProps<{
    year: number;
    distanceMi: number;
    elevationFt: number;
    rideCount: number;
    note?: string;
    /** Heading level for the year, so callers own the document outline. */
    as?: "h2" | "h3" | "h4" | "h5" | "h6";
  }>(),
  { as: "h2" },
);

const { distanceUnit, elevationUnit, formatDistance, formatElevation } =
  useUnits();
</script>

<template>
  <div
    class="flex flex-wrap items-baseline gap-x-6 gap-y-3 rounded-lg border border-border px-4 py-3"
  >
    <!-- The year is what the numbers beside it belong to, so it carries the
         panel's heading rather than sitting in the tree as loose text. -->
    <component
      :is="as"
      class="font-sans text-[26px] leading-none font-extrabold tracking-tight"
    >
      {{ year }}
    </component>
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
