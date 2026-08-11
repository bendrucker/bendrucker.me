<script setup lang="ts">
import { bareRide, epicRide, everydayRide, raceRide } from "./fixtures";
import RouteMap from "./RouteMap.vue";
import type { Coordinate } from "./types";

const routes: Record<string, Coordinate[]> = {
  epic: epicRide.route ?? [],
  everyday: everydayRide.route ?? [],
  race: raceRide.route ?? [],
  none: bareRide.route ?? [],
  single: [[37.8991, -122.5253]],
  transcontinental: [
    [33.9416, -118.4085],
    [40.6413, -73.7781],
  ],
  antimeridian: [
    [-16.9, 179.88],
    [-16.92, 179.96],
    [-16.94, -179.96],
    [-16.95, -179.9],
  ],
};

const sizes = [
  { label: "96 × 96", width: 96, height: 96 },
  { label: "150 × 140 (log)", width: 150, height: 140 },
  { label: "340 × 130 (highlight)", width: 340, height: 130 },
  { label: "480 × 260", width: 480, height: 260 },
];

function initState() {
  return { route: "epic", width: 150, height: 140 };
}
</script>

<template>
  <Story
    title="Route map"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Route map" :init-state="initState">
      <template #default="{ state }">
        <RouteMap
          :coordinates="routes[state.route]!"
          :width="state.width"
          :height="state.height"
          label="Route map"
        />
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.route"
          title="route"
          :options="{
            epic: 'a long ride',
            everyday: 'a short loop',
            race: 'a tight circuit',
            none: 'no route',
            single: 'a single coordinate',
            transcontinental: 'coast to coast',
            antimeridian: 'across the antimeridian',
          }"
        />
        <HstSlider v-model="state.width" title="width" :min="64" :max="480" />
        <HstSlider v-model="state.height" title="height" :min="64" :max="300" />
      </template>
    </Variant>

    <Variant title="Sizes">
      <div class="flex flex-wrap items-end gap-4">
        <figure v-for="size in sizes" :key="size.label" class="space-y-1">
          <RouteMap
            :coordinates="epicRide.route"
            :width="size.width"
            :height="size.height"
            :label="`Route map for ${epicRide.name}`"
          />
          <figcaption class="text-[11px] text-foreground/70">
            {{ size.label }}
          </figcaption>
        </figure>
      </div>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Route map

A ride's track, projected and drawn to fit whatever box it is given.

The route control covers the cases the projection has to survive: one point, no
points, a continent-wide bounding box, and a track that crosses the antimeridian.
Sizes compares the four boxes the site actually asks for.
</docs>
