<script setup lang="ts">
import { computed } from "vue";
import { rideDate } from "./datetime";
import RideBadge from "./RideBadge.vue";
import RouteMap from "./RouteMap.vue";
import StatValue from "./StatValue.vue";
import StravaLink from "./StravaLink.vue";
import type { Highlight } from "@/activity/types";
import { useUnits } from "./useUnits";

const props = withDefaults(
  defineProps<{
    highlight: Highlight;
    mapWidth?: number;
    mapHeight?: number;
    /** Heading level for the ride name, so callers own the document outline. */
    headingAs?: "h2" | "h3" | "h4" | "h5" | "h6";
  }>(),
  { mapWidth: 260, mapHeight: 130, headingAs: "h3" },
);

const {
  distanceUnit,
  elevationUnit,
  formatClock,
  formatDistance,
  formatDuration,
  formatElevation,
} = useUnits();

const ride = computed(() => props.highlight.ride);

const started = computed(() => rideDate(ride.value.startedAt));

const hasRoute = computed(() => ride.value.route !== undefined);

const subParts = computed(() => {
  const parts = [];
  // The headline metric already carries the duration, in a clock format that
  // rounds differently, so printing both would show two disagreeing numbers.
  const { movingSeconds } = ride.value;
  if (props.highlight.metric !== "duration" && movingSeconds !== undefined) {
    parts.push(formatDuration(movingSeconds));
  }
  if (ride.value.averageWatts) parts.push(`${ride.value.averageWatts} W`);
  return parts.join(" · ");
});

interface Headline {
  value: string;
  unit?: string;
  label: string;
}

// A highlight is chosen for a measurement the ride has, so the null branch is
// a caller's mistake rather than a state the page reaches.
const metric = computed<Headline | null>(() => {
  const { distanceMi, elevationFt, movingSeconds } = ride.value;
  switch (props.highlight.metric) {
    case "distance":
      if (distanceMi === undefined) return null;
      return {
        value: formatDistance(distanceMi),
        unit: distanceUnit.value,
        label: "distance",
      };
    case "elevation":
      if (elevationFt === undefined) return null;
      return {
        value: formatElevation(elevationFt),
        unit: elevationUnit.value,
        label: "climbing",
      };
    case "duration":
      if (movingSeconds === undefined) return null;
      return { value: formatClock(movingSeconds), label: "moving time" };
    default:
      return null;
  }
});

/** Whichever of the two the headline is not already showing, or both. */
const totals = computed(() => {
  const { distanceMi, elevationFt } = ride.value;
  const parts = [];
  if (props.highlight.metric !== "distance" && distanceMi !== undefined) {
    parts.push(`${formatDistance(distanceMi)} ${distanceUnit.value}`);
  }
  if (props.highlight.metric !== "elevation" && elevationFt !== undefined) {
    parts.push(`${formatElevation(elevationFt)} ${elevationUnit.value}`);
  }
  return parts.join(" · ");
});
</script>

<template>
  <article
    class="flex flex-col overflow-hidden rounded-lg border border-border bg-background"
    :aria-label="`${ride.name}, ${started.full}`"
  >
    <div
      v-if="hasRoute"
      class="flex justify-center overflow-hidden border-b border-border"
    >
      <div class="relative">
        <RouteMap
          :route="ride.route"
          :width="mapWidth"
          :height="mapHeight"
          :label="`Route map for ${ride.name}`"
        />
        <div class="absolute top-2 left-2 rounded-sm bg-background">
          <RideBadge :badge="highlight.badge" />
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2 p-3">
      <!-- A trainer ride has no polyline to draw, and an empty map slab with a
           badge floating on it reads as a failure rather than a highlight. -->
      <RideBadge v-if="!hasRoute" :badge="highlight.badge" class="self-start" />

      <div class="flex items-start justify-between gap-2">
        <component :is="headingAs" class="min-w-0">
          <a
            v-if="ride.stravaUrl"
            :href="ride.stravaUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[15px] font-bold wrap-anywhere hover:text-accent"
          >
            {{ ride.name }}
          </a>
          <span v-else class="text-[15px] font-bold wrap-anywhere">
            {{ ride.name }}
          </span>
        </component>
        <StravaLink
          v-if="ride.stravaUrl"
          :href="ride.stravaUrl"
          :name="ride.name"
          class="mt-1 shrink-0"
        />
      </div>

      <p class="text-[11px] text-foreground/70">
        <time :datetime="ride.startedAt">{{ started.short }}</time
        ><template v-if="subParts"> · {{ subParts }}</template>
      </p>

      <StatValue
        v-if="metric"
        :value="metric.value"
        :unit="metric.unit"
        :label="metric.label"
        size="lg"
      />

      <p v-if="totals" class="text-[11px] text-foreground/70">{{ totals }}</p>
    </div>
  </article>
</template>
