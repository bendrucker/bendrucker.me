<script setup lang="ts">
import { computed } from "vue";
import type { Ride } from "@/activity/types";
import RowStat from "@/components/RowStat.vue";
import { formatRecency } from "@/components/recency";
import { parseRideTime, rideDate } from "./datetime";
import { formatDuration } from "./format";
import { useUnits } from "./useUnits";

/**
 * One ride as two lines in a list: the name and how long ago, then its
 * figures behind icons. The row is what a page shows where a card would be
 * too much.
 */
const props = defineProps<{ ride: Ride; now?: Date }>();

const { distanceUnit, elevationUnit, formatDistance, formatElevation } =
  useUnits();

const when = computed(() =>
  formatRecency(parseRideTime(props.ride.startedAt), props.now),
);
const full = computed(() => rideDate(props.ride.startedAt).full);

const companions = computed(() => {
  const count = props.ride.companionCount;
  if (!count) return undefined;
  return `+${count}`;
});
</script>

<template>
  <div
    class="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-muted py-2.5 text-sm"
  >
    <a
      v-if="ride.stravaUrl"
      :href="ride.stravaUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="min-w-0 flex-1 truncate hover:text-accent"
    >
      {{ ride.name }}
    </a>
    <span v-else class="min-w-0 flex-1 truncate">{{ ride.name }}</span>
    <time
      :datetime="ride.startedAt"
      :title="full"
      class="shrink-0 text-xs text-foreground/50"
    >
      {{ when }}
    </time>
    <span
      class="flex basis-full flex-wrap gap-x-3.5 gap-y-1 text-xs text-foreground/70 tabular-nums"
    >
      <RowStat
        v-if="ride.distanceMi !== undefined"
        icon="ruler"
        label="Distance"
      >
        {{ formatDistance(ride.distanceMi) }} {{ distanceUnit }}
      </RowStat>
      <RowStat
        v-if="ride.elevationFt !== undefined"
        icon="mountain"
        label="Climbing"
      >
        {{ formatElevation(ride.elevationFt) }} {{ elevationUnit }}
      </RowStat>
      <RowStat
        v-if="ride.movingSeconds !== undefined"
        icon="clock"
        label="Moving time"
      >
        {{ formatDuration(ride.movingSeconds) }}
      </RowStat>
      <RowStat v-if="ride.averageWatts" icon="zap" label="Average power">
        {{ ride.averageWatts }} W
      </RowStat>
      <RowStat v-if="companions" icon="users" label="Riders along">
        {{ companions }}
      </RowStat>
    </span>
  </div>
</template>
