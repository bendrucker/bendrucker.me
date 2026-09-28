<script setup lang="ts">
import RouteMap from "@/components/cycling/RouteMap.vue";
import { HIGHLIGHT_MAP } from "@/components/cycling/basemap";

defineProps<{
  href: string;
  name: string;
  /** Distance and climbing, each already formatted with its unit. */
  figures: readonly string[];
  hilly?: boolean;
  /** The ride the basemap is rendered for. */
  id: string;
  /** The track as an encoded polyline. Without one the map is left out. */
  route?: string;
  /** A square thumbnail, inset over the map's corner. */
  photo?: { url: string; alt: string };
}>();
</script>

<template>
  <!-- The Rides card's lead: the top highlight's map at the highlight size,
       with one photo in its corner, beside its name and figures. On a phone
       the map takes the card's width and the words drop beneath it.

       The photo is a background on a tile rather than an <img>. Nothing
       hydrates this markup, so an image that fails to load could not hide
       itself, and would draw a broken-image glyph over the map. -->

  <a
    :href="href"
    class="group/feature -mx-1.5 flex min-w-0 flex-col gap-2.5 rounded-lg p-1.5 text-foreground no-underline hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cat focus-visible:outline-solid md:flex-row md:items-center md:gap-4"
  >
    <span
      v-if="route"
      class="relative block w-full flex-none overflow-hidden rounded-lg md:w-[260px]"
    >
      <RouteMap
        :id="id"
        :route="route"
        :width="HIGHLIGHT_MAP.width"
        :height="HIGHLIGHT_MAP.height"
        :label="`Route of ${name}`"
        fluid
        tint
        :stroke-width="2.5"
      />
      <span
        v-if="photo"
        role="img"
        :aria-label="photo.alt"
        class="absolute right-2 bottom-2 size-14 rotate-3 rounded-md border-2 border-background bg-tile bg-cover bg-center shadow-[0_6px_14px_-6px_var(--shadow)] transition-transform duration-400 ease-spring group-hover/feature:rotate-0 motion-reduce:transition-none"
        :style="{ backgroundImage: `url(${photo.url})` }"
      />
    </span>
    <!-- A ride with no track still has its photo, standing alone. -->
    <span
      v-else-if="photo"
      role="img"
      :aria-label="photo.alt"
      class="size-24 flex-none rounded-lg bg-tile bg-cover bg-center"
      :style="{ backgroundImage: `url(${photo.url})` }"
    />
    <span class="flex min-w-0 flex-col gap-1">
      <span class="line-clamp-2 text-base leading-snug font-medium">{{
        name
      }}</span>
      <span
        class="inline-flex items-center gap-1.5 font-mono text-xs whitespace-nowrap text-dim tabular-nums"
      >
        <span
          v-if="hilly"
          role="img"
          aria-label="Hilly"
          class="size-[13px] icon-[lucide--mountain]"
        />
        <template v-for="(figure, i) in figures" :key="figure">
          <span v-if="i > 0" aria-hidden="true">·</span>
          <span>{{ figure }}</span>
        </template>
      </span>
    </span>
  </a>
</template>
