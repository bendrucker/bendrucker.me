<script setup lang="ts">
import { computed } from "vue";
import { fitRoute } from "./geo";
import type { Coordinate } from "./types";

const TILE_SIZE = 256;

const props = defineProps<{
  coordinates?: Coordinate[];
  width: number;
  height: number;
  label?: string;
}>();

const hasRoute = computed(() => (props.coordinates?.length ?? 0) >= 2);

const fitted = computed(() =>
  fitRoute(props.coordinates ?? [], props.width, props.height),
);
</script>

<template>
  <div
    class="relative overflow-hidden bg-muted text-accent"
    :style="{ width: `${width}px`, height: `${height}px` }"
  >
    <!-- Only the light basemap is fetched. Desaturating it first means the
         dark inversion lands on gray rather than on complementary hues. -->
    <img
      v-for="tile in fitted.tiles"
      :key="tile.key"
      :src="tile.url"
      alt=""
      aria-hidden="true"
      loading="lazy"
      :width="TILE_SIZE"
      :height="TILE_SIZE"
      class="absolute max-w-none opacity-85 contrast-[.92] grayscale-[.9] dark:opacity-70 dark:invert"
      :style="{ left: `${tile.left}px`, top: `${tile.top}px` }"
    />
    <svg
      v-if="hasRoute"
      class="absolute inset-0"
      :viewBox="`0 0 ${width} ${height}`"
      :width="width"
      :height="height"
      role="img"
      :aria-label="label ?? 'Route map'"
    >
      <path
        :d="fitted.path"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>
