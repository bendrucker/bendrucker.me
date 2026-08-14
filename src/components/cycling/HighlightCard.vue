<script setup lang="ts">
import { computed } from "vue";
import { rideDate } from "./datetime";
import RideBadge from "./RideBadge.vue";
import RouteMap from "./RouteMap.vue";
import StatValue from "./StatValue.vue";
import StravaLink from "./StravaLink.vue";
import type { Highlight } from "./types";
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

const hasRoute = computed(() => (ride.value.route?.length ?? 0) >= 2);

const subParts = computed(() => {
  const parts = [];
  // The headline metric already carries the duration, in a clock format that
  // rounds differently, so printing both would show two disagreeing numbers.
  if (props.highlight.metric !== "duration") {
    parts.push(formatDuration(ride.value.movingSeconds));
  }
  if (ride.value.averageWatts) parts.push(`${ride.value.averageWatts} W`);
  return parts.join(" · ");
});

const metric = computed<{ value: string; unit?: string; label: string }>(
  () =>
    ({
      distance: {
        value: formatDistance(ride.value.distanceMi),
        unit: distanceUnit.value,
        label: "distance",
      },
      elevation: {
        value: formatElevation(ride.value.elevationFt),
        unit: elevationUnit.value,
        label: "climbing",
      },
      duration: {
        value: formatClock(ride.value.movingSeconds),
        label: "moving time",
      },
    })[props.highlight.metric],
);

/** Whichever of the two the headline is not already showing, or both. */
const totals = computed(() => {
  const parts = [];
  if (props.highlight.metric !== "distance") {
    parts.push(
      `${formatDistance(ride.value.distanceMi)} ${distanceUnit.value}`,
    );
  }
  if (props.highlight.metric !== "elevation") {
    parts.push(
      `${formatElevation(ride.value.elevationFt)} ${elevationUnit.value}`,
    );
  }
  return parts.join(" · ");
});
</script>

<template>
  <article
    class="flex flex-col border border-border rounded-lg overflow-hidden bg-background"
    :aria-label="`${ride.name}, ${started.full}`"
  >
    <div
      v-if="hasRoute"
      class="flex justify-center overflow-hidden border-b border-border"
    >
      <div class="relative">
        <RouteMap
          :coordinates="ride.route"
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
            :href="ride.stravaUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[15px] font-bold wrap-anywhere hover:text-accent"
          >
            {{ ride.name }}
          </a>
        </component>
        <StravaLink
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
        :value="metric.value"
        :unit="metric.unit"
        :label="metric.label"
        size="lg"
      />

      <p class="text-[11px] text-foreground/70">{{ totals }}</p>
    </div>
  </article>
</template>
