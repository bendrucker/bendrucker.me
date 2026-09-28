<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { distanceFigure } from "@/rides/format";
import { isHilly } from "@/rides/rank";
import { fromRouteTuple, type RouteTile as Tile } from "@/rides/rows";
import { routes } from "./fixtures";
import RouteTile from "./RouteTile.vue";

const tiles = routes.map((row) => fromRouteTuple(row));

const LONG_NAME =
  "Marin Headlands, Hawk Hill, and the long way back over the bridge";

const controls: StoryControlSet = {
  tile: {
    type: "select",
    title: "tile",
    options: Object.fromEntries(tiles.map((tile, i) => [String(i), tile.name])),
  },
  long: { type: "checkbox", title: "long name" },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
};

function initState() {
  return { tile: "0", long: false, units: "imperial" as "imperial" | "metric" };
}

function pick(state: { tile: string; long: boolean }): Tile {
  const tile = tiles[Number(state.tile)] ?? tiles[0]!;
  return state.long ? { ...tile, name: LONG_NAME } : tile;
}
</script>

<template>
  <Story
    title="Route tile"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Route tile" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div class="tint-5 p-3 cat-rides">
          <div class="w-[170px]">
            <RouteTile
              :tile="pick(state)"
              href="#"
              :figure="distanceFigure(pick(state).distanceM, state.units)"
              :hilly="isHilly(pick(state))"
            />
          </div>
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>

    <Variant title="In the grid">
      <ul class="grid grid-cols-2 gap-2 tint-5 p-3 cat-rides">
        <li v-for="tile in tiles" :key="tile.id" class="min-w-0">
          <RouteTile
            :tile="tile"
            href="#"
            :figure="distanceFigure(tile.distanceM, 'imperial')"
            :hilly="isHilly(tile)"
          />
        </li>
      </ul>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Route tile

One named route on the Rides route's Routes view: the ride's track drawn into a
132 square, its name, and its distance, with the mountain mark on a ride that
climbs 18 m or more per kilometre.

The line is simplified server-side to what the square can show and carried as
SVG path data, so there is no basemap to wait on or credit. The grid is two
columns on a phone and three from the desktop breakpoint up.
</docs>
