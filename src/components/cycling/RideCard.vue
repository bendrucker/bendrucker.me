<script setup lang="ts">
import { format } from "date-fns";
import { computed } from "vue";
import ElevationProfile from "./ElevationProfile.vue";
import FactChip from "./FactChip.vue";
import PhotoStrip from "./PhotoStrip.vue";
import RideBadge from "./RideBadge.vue";
import RouteMap from "./RouteMap.vue";
import StatValue from "./StatValue.vue";
import StravaLink from "./StravaLink.vue";
import type { Ride } from "./types";
import { useUnits } from "./useUnits";

const props = withDefaults(
  defineProps<{
    ride: Ride;
    mapWidth?: number;
    mapHeight?: number;
  }>(),
  { mapWidth: 150, mapHeight: 140 },
);

defineEmits<{ openPhoto: [index: number] }>();

const {
  distanceUnit,
  elevationUnit,
  formatDistance,
  formatDuration,
  formatElevation,
} = useUnits();

const startedAt = computed(() => new Date(props.ride.startedAt));

const dateLabel = computed(() =>
  format(startedAt.value, "EEE M/d").toLowerCase(),
);

const fullDate = computed(() => format(startedAt.value, "PPPP"));

const hasRoute = computed(() => (props.ride.route?.length ?? 0) > 1);

const metaLine = computed(() => {
  const { movingSeconds, averageWatts, companionCount } = props.ride;
  const parts = [formatDuration(movingSeconds)];
  if (averageWatts) parts.push(`${averageWatts} W`);
  if (companionCount) {
    parts.push(`+${companionCount} rider${companionCount === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
});
</script>

<template>
  <article
    class="grid grid-cols-1 border border-border rounded-lg overflow-hidden bg-background"
    :class="hasRoute ? 'sm:grid-cols-[var(--map-width)_1fr]' : ''"
    :style="{ '--map-width': `${mapWidth}px` }"
    :aria-label="`${ride.name}, ${fullDate}`"
  >
    <div
      v-if="hasRoute"
      class="flex items-center justify-center border-b border-border sm:border-b-0 sm:border-r"
    >
      <RouteMap
        :coordinates="ride.route"
        :width="mapWidth"
        :height="mapHeight"
        :label="`Route map for ${ride.name}`"
      />
    </div>

    <div class="relative min-w-0 p-3">
      <ElevationProfile
        v-if="ride.elevationProfile?.length"
        :samples="ride.elevationProfile"
        class="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
      />

      <div class="relative flex flex-col gap-2">
        <div class="flex items-start justify-between gap-2">
          <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <a
              :href="ride.stravaUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[15px] font-bold hover:text-accent"
            >
              {{ ride.name }}
            </a>
            <ul v-if="ride.badges.length" class="flex flex-wrap gap-1">
              <li v-for="badge in ride.badges" :key="badge.kind">
                <RideBadge :badge="badge" />
              </li>
            </ul>
          </div>

          <div
            class="flex shrink-0 items-center gap-2 text-[11px] text-foreground/55"
          >
            <time :datetime="ride.startedAt" :title="fullDate">
              {{ dateLabel }}
            </time>
            <StravaLink :href="ride.stravaUrl" />
          </div>
        </div>

        <p class="text-[11px] text-foreground/60">{{ metaLine }}</p>

        <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <StatValue
            :value="formatDistance(ride.distanceMi)"
            :unit="distanceUnit"
            label="distance"
          />
          <div class="flex items-baseline gap-0.5">
            <StatValue
              :value="formatElevation(ride.elevationFt)"
              :unit="elevationUnit"
              label="climbing"
            />
            <span
              aria-hidden="true"
              class="text-xs font-semibold text-foreground/55"
            >
              ▲
            </span>
          </div>
        </div>

        <PhotoStrip :photos="ride.photos" @open="$emit('openPhoto', $event)" />

        <ul v-if="ride.facts.length" class="flex flex-wrap gap-1">
          <li v-for="fact in ride.facts" :key="fact.id">
            <FactChip :fact="fact" />
          </li>
        </ul>
      </div>
    </div>
  </article>
</template>
