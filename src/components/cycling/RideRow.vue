<script setup lang="ts">
import { computed } from "vue";
import type { Ride } from "@/activity/types";
import { rideDate } from "./datetime";
import { useUnits } from "./useUnits";

/**
 * One ride as a line in a list: when, what, how far, how high. The row is
 * what a page shows where a card would be too much, and the stats sit in
 * fixed columns so a list of them reads down as well as across.
 */
const props = defineProps<{ ride: Ride }>();

const { distanceUnit, elevationUnit, formatDistance, formatElevation } =
  useUnits();

const started = computed(() => rideDate(props.ride.startedAt));
</script>

<template>
  <div
    class="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-muted py-2.5 text-sm"
  >
    <time
      :datetime="ride.startedAt"
      :title="started.full"
      class="text-foreground/50 tabular-nums"
    >
      {{ started.short }}
    </time>
    <a
      v-if="ride.stravaUrl"
      :href="ride.stravaUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="truncate hover:text-accent"
    >
      {{ ride.name }}
    </a>
    <span v-else class="truncate">{{ ride.name }}</span>
    <span class="flex gap-3 text-foreground/70 tabular-nums">
      <span
        v-if="ride.distanceMi !== undefined"
        class="min-w-[4.5rem] text-right"
      >
        {{ formatDistance(ride.distanceMi) }} {{ distanceUnit }}
      </span>
      <span
        v-if="ride.elevationFt !== undefined"
        class="min-w-[4.5rem] text-right"
      >
        {{ formatElevation(ride.elevationFt) }} {{ elevationUnit }}
      </span>
    </span>
  </div>
</template>
