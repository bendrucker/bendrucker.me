<script setup lang="ts">
import { format } from "date-fns";
import { computed } from "vue";
import RideBadge from "./RideBadge.vue";
import RouteMap from "./RouteMap.vue";
import StatValue from "./StatValue.vue";
import type { Highlight } from "./types";
import { useUnits } from "./useUnits";

const MAP_WIDTH = 260;
const MAP_HEIGHT = 130;

const props = defineProps<{ highlight: Highlight }>();

const {
  distanceUnit,
  elevationUnit,
  formatClock,
  formatDistance,
  formatDuration,
  formatElevation,
} = useUnits();

const ride = computed(() => props.highlight.ride);

const startedAt = computed(() => new Date(ride.value.startedAt));

const dateLabel = computed(() =>
  format(startedAt.value, "EEE M/d").toLowerCase(),
);

const fullDate = computed(() => format(startedAt.value, "PPPP"));

const subSuffix = computed(() => {
  const parts = [formatDuration(ride.value.movingSeconds)];
  if (ride.value.averageWatts !== undefined) {
    parts.push(`${ride.value.averageWatts} W`);
  }
  return ` · ${parts.join(" · ")}`;
});

const metric = computed<{ value: string; unit?: string; label: string }>(() => {
  switch (props.highlight.metric) {
    case "distance":
      return {
        value: formatDistance(ride.value.distanceMi),
        unit: distanceUnit.value,
        label: "distance",
      };
    case "elevation":
      return {
        value: formatElevation(ride.value.elevationFt),
        unit: elevationUnit.value,
        label: "climbing",
      };
    case "duration":
      return {
        value: formatClock(ride.value.movingSeconds),
        label: "moving time",
      };
  }
});

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
    <div
      class="relative flex justify-center overflow-hidden border-b border-border"
    >
      <RouteMap
        :coordinates="ride.route"
        :width="MAP_WIDTH"
        :height="MAP_HEIGHT"
        :label="`Route map for ${ride.name}`"
      />
      <div class="absolute left-2 top-2 rounded-sm bg-background/80">
        <RideBadge :badge="highlight.badge" />
      </div>
    </div>

    <div class="flex flex-col gap-2 p-3">
      <a
        :href="ride.stravaUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="text-[15px] font-bold hover:text-accent"
      >
        {{ ride.name }}
      </a>

      <p class="text-[11px] text-foreground/60">
        <time :datetime="ride.startedAt" :title="fullDate">
          {{ dateLabel }}
        </time>
        {{ subSuffix }}
      </p>

      <StatValue
        :value="metric.value"
        :unit="metric.unit"
        :label="metric.label"
        size="lg"
      />

      <p class="text-[11px] text-foreground/55">{{ totals }}</p>
    </div>
  </article>
</template>
