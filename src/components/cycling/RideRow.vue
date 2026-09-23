<script setup lang="ts">
import { computed } from "vue";
import type { Ride } from "@/activity/types";
import { rideDate } from "./datetime";
import { useUnits } from "./useUnits";

/**
 * One ride as a line in a list: the name and how far, to the mile. When it
 * was is left to the title.
 */
const props = defineProps<{ ride: Ride }>();

const { distanceUnit, formatDistance } = useUnits();

const full = computed(() => rideDate(props.ride.startedAt).full);
</script>

<template>
  <div class="flex items-baseline gap-x-3 py-1">
    <a
      v-if="ride.stravaUrl"
      :href="ride.stravaUrl"
      target="_blank"
      rel="noopener noreferrer"
      :title="full"
      class="min-w-0 truncate hover:text-accent"
    >
      {{ ride.name }}
    </a>
    <span v-else :title="full" class="min-w-0 truncate">{{ ride.name }}</span>
    <span
      v-if="ride.distanceMi !== undefined"
      class="ml-auto shrink-0 text-xs text-foreground/35 tabular-nums"
    >
      {{ formatDistance(ride.distanceMi, 0) }} {{ distanceUnit }}
    </span>
  </div>
</template>
