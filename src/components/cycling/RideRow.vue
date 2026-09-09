<script setup lang="ts">
import { computed } from "vue";
import type { Ride } from "@/activity/types";
import LucideIcon from "@/components/LucideIcon.vue";
import { rideTraits } from "./character";
import { rideDate } from "./datetime";
import { useUnits } from "./useUnits";

/**
 * One ride as a line in a list: the name, an icon for anything notable
 * about it, and how far. A tease of the ride, for a page whose job is to
 * say what has been going on lately. When it was is the list's to say.
 */
const props = defineProps<{ ride: Ride }>();

const { distanceUnit, formatDistance } = useUnits();

const traits = computed(() => rideTraits(props.ride));
const full = computed(() => rideDate(props.ride.startedAt).full);
</script>

<template>
  <div class="flex items-baseline gap-x-3 border-b border-muted py-2.5 text-sm">
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
  </div>
</template>
