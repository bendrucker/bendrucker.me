<script setup lang="ts">
import { bareRide, epicRide, everydayRide, raceRide } from "./fixtures";
import RouteMap from "./RouteMap.vue";
import type { Coordinate } from "./types";

const singleCoordinate: Coordinate[] = [[37.8991, -122.5253]];

const transcontinental: Coordinate[] = [
  [33.9416, -118.4085],
  [40.6413, -73.7781],
];

const acrossTheDateline: Coordinate[] = [
  [-16.9, 179.88],
  [-16.92, 179.96],
  [-16.94, -179.96],
  [-16.95, -179.9],
];

const sizes = [
  { label: "96 × 96", width: 96, height: 96 },
  { label: "150 × 140 (log)", width: 150, height: 140 },
  { label: "340 × 130 (highlight)", width: 340, height: 130 },
  { label: "480 × 260", width: 480, height: 260 },
];
</script>

<template>
  <Story title="Cycling/Route map" :layout="{ type: 'grid', width: '100%' }">
    <Variant title="Log size">
      <RouteMap
        :coordinates="epicRide.route"
        :width="150"
        :height="140"
        :label="`Route map for ${epicRide.name}`"
      />
    </Variant>

    <Variant title="Highlight size">
      <RouteMap
        :coordinates="epicRide.route"
        :width="340"
        :height="130"
        :label="`Route map for ${epicRide.name}`"
      />
    </Variant>

    <Variant title="Short route">
      <RouteMap
        :coordinates="everydayRide.route"
        :width="150"
        :height="140"
        :label="`Route map for ${everydayRide.name}`"
      />
    </Variant>

    <Variant title="Tight route">
      <RouteMap
        :coordinates="raceRide.route"
        :width="340"
        :height="130"
        :label="`Route map for ${raceRide.name}`"
      />
    </Variant>

    <Variant title="No route">
      <RouteMap :coordinates="bareRide.route" :width="150" :height="140" />
    </Variant>

    <Variant title="Single coordinate">
      <RouteMap :coordinates="singleCoordinate" :width="150" :height="140" />
    </Variant>

    <Variant title="Transcontinental route">
      <RouteMap
        :coordinates="transcontinental"
        :width="340"
        :height="130"
        label="Route map from Los Angeles to New York"
      />
    </Variant>

    <Variant title="Across the antimeridian">
      <RouteMap
        :coordinates="acrossTheDateline"
        :width="340"
        :height="130"
        label="Route map crossing the antimeridian"
      />
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
