<script setup lang="ts">
import type { RouteTile } from "@/rides/rows";
import { TILE_SIZE } from "@/rides/tile";

defineProps<{
  tile: RouteTile;
  href: string;
  /** The distance, already formatted: `67 mi`. */
  figure: string;
  hilly?: boolean;
}>();
</script>

<template>
  <!-- One link per tile, the whole card clickable. The line is the ride's own
       track drawn server-side into the tile's square, so there is no basemap
       here to credit or wait on. -->
  <a
    :href="href"
    class="group/tile flex min-w-0 flex-col gap-1.5 rounded-xl bg-background/60 p-2.5 text-foreground no-underline transition-[background-color,translate] duration-250 ease-spring hover:-translate-y-0.5 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cat motion-reduce:transition-none motion-reduce:hover:translate-y-0"
  >
    <svg
      :viewBox="`0 0 ${TILE_SIZE} ${TILE_SIZE}`"
      class="aspect-square h-auto w-full rounded-lg tint-8"
      aria-hidden="true"
    >
      <path
        :d="tile.path"
        fill="none"
        stroke="var(--cat)"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span class="line-clamp-1 text-sm wrap-anywhere">{{ tile.name }}</span>
    <span
      class="inline-flex items-center gap-1.5 font-mono text-xs text-dim tabular-nums"
    >
      {{ figure }}
      <span
        v-if="hilly"
        role="img"
        aria-label="Hilly"
        class="icon-[lucide--mountain] size-3"
      />
    </span>
  </a>
</template>
