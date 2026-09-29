<script setup lang="ts">
import RouteMap from "@/components/cycling/RouteMap.vue";
import { FEATURE_MAP } from "@/components/cycling/basemap";

/** The card width each photo past the first needs before it shows. */
const PHOTO_ROOM = [
  "",
  "hidden @[310px]:block",
  "hidden @[540px]:block",
  "hidden @[640px]:block",
];

defineProps<{
  href: string;
  name: string;
  /** The ride's day, already worded: "Saturday, July 11". */
  when: string;
  /** Distance and climbing, each already formatted with its unit. */
  figures: readonly string[];
  hilly?: boolean;
  /** The ride the basemap is rendered for. */
  id: string;
  /** The track as an encoded polyline. Without one the map is left out. */
  route?: string;
  /** Square thumbnails, as many as the card has room for up to four. */
  photos?: readonly { url: string; alt: string }[];
}>();
</script>

<template>
  <!-- The Rides card's lead: the top highlight's map, its words, then a row of
       photos that grows with the card's width, so the name and figures show
       within the card's peek at either width.

       A photo is a background on a tile rather than an <img>. Nothing hydrates
       this markup, so an image that fails to load could not hide itself, and
       would draw a broken-image glyph. -->
  <a
    :href="href"
    class="group/feature @container -mx-1.5 flex min-w-0 items-center gap-3 rounded-lg p-1.5 text-foreground no-underline hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cat focus-visible:outline-solid md:gap-4"
  >
    <span
      v-if="route"
      class="block w-[120px] flex-none overflow-hidden rounded-lg md:w-[176px]"
    >
      <RouteMap
        :id="id"
        :route="route"
        :width="FEATURE_MAP.width"
        :height="FEATURE_MAP.height"
        :label="`Route of ${name}`"
        fluid
        tint
        :stroke-width="2.5"
      />
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-1">
      <span class="label-caps text-[11px] leading-none text-dim">{{
        when
      }}</span>
      <span
        class="line-clamp-2 text-base leading-snug font-medium md:text-lg"
        >{{ name }}</span
      >
      <span
        class="inline-flex flex-wrap items-center gap-x-1.5 font-mono text-xs text-dim tabular-nums"
      >
        <span
          v-if="hilly"
          role="img"
          aria-label="Hilly"
          class="size-[13px] icon-[lucide--mountain]"
        />
        <template v-for="(figure, i) in figures" :key="figure">
          <span v-if="i > 0" aria-hidden="true">·</span>
          <span class="whitespace-nowrap">{{ figure }}</span>
        </template>
      </span>
    </span>
    <span v-if="photos?.length" class="flex flex-none gap-1">
      <span
        v-for="(photo, i) in photos.slice(0, 4)"
        :key="photo.url"
        role="img"
        :aria-label="photo.alt"
        class="size-10 rounded-md bg-tile bg-cover bg-center md:size-16"
        :class="PHOTO_ROOM[i]"
        :style="{ backgroundImage: `url(${photo.url})` }"
      />
    </span>
  </a>
</template>
