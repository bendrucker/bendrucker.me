<script setup lang="ts">
import { format } from "date-fns";
import { computed } from "vue";
import { parseRideTime } from "./datetime";
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

const startedAt = computed(() => parseRideTime(ride.value.startedAt));

const dateLabel = computed(() =>
  format(startedAt.value, "EEE M/d").toLowerCase(),
);

const fullDate = computed(() => format(startedAt.value, "PPPP"));

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

const totals = computed(
  () =>
    `${formatDistance(ride.value.distanceMi)} ${distanceUnit.value} · ${formatElevation(ride.value.elevationFt)} ${elevationUnit.value}`,
);
</script>

<template>
  <article
    class="flex flex-col border border-border rounded-lg overflow-hidden bg-background"
    :aria-label="`${ride.name}, ${fullDate}`"
  >
    <div class="flex justify-center overflow-hidden border-b border-border">
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
        <time :datetime="ride.startedAt">{{ dateLabel }}</time
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
