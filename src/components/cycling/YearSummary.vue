<script setup lang="ts">
import { computed } from "vue";
import StatValue from "./StatValue.vue";
import { useUnits } from "./useUnits";

const props = withDefaults(
  defineProps<{
    year: number;
    distanceMi: number;
    elevationFt: number;
    rideCount: number;
    /** Heading level for the year, so callers own the document outline. */
    as?: "h2" | "h3" | "h4" | "h5" | "h6";
  }>(),
  { as: "h2" },
);

const { distanceUnit, elevationUnit, formatDistance, formatElevation } =
  useUnits();

const rideUnit = computed(() => (props.rideCount === 1 ? "ride" : "rides"));
</script>

<template>
  <div class="rounded-lg border border-border">
    <!-- The year scopes every number below it, so it caps the panel rather
         than standing in the row as a fourth stat. The cap is also the one
         strip of the header with room for a control. -->
    <div
      class="flex items-center justify-between gap-3 border-b border-border px-4 py-2"
    >
      <component
        :is="as"
        class="text-[11px] font-bold tracking-[.14em] text-foreground/70"
      >
        {{ year }}
      </component>
      <slot name="controls" />
    </div>

    <div class="flex flex-wrap items-baseline gap-x-6 gap-y-3 px-4 py-3">
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
        :unit="rideUnit"
        size="lg"
      />
    </div>
  </div>
</template>
