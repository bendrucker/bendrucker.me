<script setup lang="ts">
import { computed } from "vue";
import type { Ride } from "@/activity/types";
import LucideIcon from "@/components/LucideIcon.vue";
import { formatRecency } from "@/components/recency";
import { rideTraits } from "./character";
import { parseRideTime, rideDate } from "./datetime";
import { useUnits } from "./useUnits";

/**
 * One ride as a line in a list: the name, an icon for anything notable
 * about it, how far, and how long ago. A tease of the ride, for a page
 * whose job is to say what has been going on lately.
 */
const props = defineProps<{ ride: Ride; now?: Date }>();

const { distanceUnit, formatDistance } = useUnits();

const traits = computed(() => rideTraits(props.ride));
const when = computed(() =>
  formatRecency(parseRideTime(props.ride.startedAt), props.now),
);
const full = computed(() => rideDate(props.ride.startedAt).full);
</script>

<template>
  <div class="flex items-baseline gap-x-3 border-b border-muted py-2.5 text-sm">
    <a
      v-if="ride.stravaUrl"
      :href="ride.stravaUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="min-w-0 truncate hover:text-accent"
    >
      {{ ride.name }}
    </a>
    <span v-else class="min-w-0 truncate">{{ ride.name }}</span>
    <span v-if="traits.length" class="flex shrink-0 gap-1 text-foreground/45">
      <span v-for="trait in traits" :key="trait.kind" :title="trait.label">
        <LucideIcon :name="trait.icon" />
        <span class="sr-only">{{ trait.label }}</span>
      </span>
    </span>
    <span
      v-if="ride.distanceMi !== undefined"
      class="ml-auto shrink-0 text-foreground/70 tabular-nums"
    >
      {{ formatDistance(ride.distanceMi) }} {{ distanceUnit }}
    </span>
    <time
      :datetime="ride.startedAt"
      :title="full"
      class="w-16 shrink-0 text-right text-xs text-foreground/50"
      :class="{ 'ml-auto': ride.distanceMi === undefined }"
    >
      {{ when }}
    </time>
  </div>
</template>
