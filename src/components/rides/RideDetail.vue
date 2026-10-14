<script setup lang="ts">
import { computed } from "vue";
import RouteMap from "@/components/cycling/RouteMap.vue";
import { HERO_MAP, HERO_MAP_PHONE } from "@/components/cycling/basemap";
import type { Units } from "@/components/cycling/types";
import ItemHeader from "@/components/parts/ItemHeader.vue";
import StatTile from "@/components/parts/StatTile.vue";
import type { RideDetailWire } from "@/rides/detail";
import { fullDate } from "@/rides/format";
import { isHilly } from "@/rides/rank";
import { rideStats } from "@/rides/stats";
import RideGallery from "./RideGallery.vue";

const props = withDefaults(
  defineProps<{
    ride: RideDetailWire;
    units: Units;
    /** The year a date leaves unsaid. */
    thisYear: string;
    /** The ride's page titles it with an `h1`, the list's modal with an `h2`. */
    level?: 1 | 2;
    backHref?: string;
    transitionName?: string;
  }>(),
  { level: 1 },
);

const stats = computed(() =>
  rideStats(
    props.ride,
    props.units,
    isHilly({ distanceM: props.ride.distanceM, climbM: props.ride.elevationM }),
  ),
);

const date = computed(() =>
  fullDate(props.ride.startedAt.slice(0, 10), props.thisYear),
);

const mapLabel = computed(() => `Route of ${props.ride.name}`);
</script>

<template>
  <!-- A ride's substance, the same on its page and in the list's modal: the
       map, the name and date, the tiles, and the shots. The page hands in a
       gallery island of its own, since the rest of the page never hydrates. -->
  <div class="flex flex-col gap-4 md:gap-5">
    <ItemHeader
      :title="ride.name"
      :back-href="backHref"
      :date="date"
      :dek="ride.description ?? undefined"
      :transition-name="transitionName"
      :level="level"
    >
      <template v-if="ride.route" #hero>
        <div class="relative my-2 overflow-hidden rounded-2xl">
          <RouteMap
            :id="ride.id"
            :route="ride.route"
            :width="HERO_MAP_PHONE.width"
            :height="HERO_MAP_PHONE.height"
            :label="mapLabel"
            fluid
            tint
            :stroke-width="3"
            class="md:hidden"
          />
          <RouteMap
            :id="ride.id"
            :route="ride.route"
            :width="HERO_MAP.width"
            :height="HERO_MAP.height"
            :label="mapLabel"
            fluid
            tint
            :stroke-width="3"
            class="max-md:hidden"
          />
          <a
            v-if="ride.stravaUrl"
            :href="ride.stravaUrl"
            target="_blank"
            rel="noopener"
            aria-label="Open on Strava"
            title="Open on Strava"
            class="absolute right-2.5 bottom-2.5 inline-flex size-7 items-center justify-center rounded-lg text-dim opacity-60 transition-[opacity,background-color,translate] duration-[200ms,200ms,350ms] ease-spring hover:translate-x-px hover:-translate-y-px hover:bg-background hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-cat"
          >
            <span
              aria-hidden="true"
              class="size-3.5 icon-[lucide--arrow-up-right]"
            />
          </a>
        </div>
      </template>
    </ItemHeader>

    <div
      v-if="stats.length > 0"
      class="grid grid-cols-2 gap-1.5 md:grid-cols-3"
    >
      <StatTile
        v-for="stat in stats"
        :key="stat.label"
        :value="stat.value"
        :unit="stat.unit"
        :label="stat.label"
        :icon="stat.icon"
      />
    </div>

    <slot name="gallery">
      <RideGallery
        v-if="ride.media.length > 0"
        :media="ride.media"
        :ride-name="ride.name"
      />
    </slot>

    <a
      v-if="!ride.route && ride.stravaUrl"
      :href="ride.stravaUrl"
      target="_blank"
      rel="noopener"
      aria-label="Open on Strava"
      title="Open on Strava"
      class="inline-flex size-7 items-center justify-center self-end rounded-lg text-dim opacity-60 transition-[opacity,background-color] hover:bg-hover hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-cat"
    >
      <span aria-hidden="true" class="size-3.5 icon-[lucide--arrow-up-right]" />
    </a>
  </div>
</template>
