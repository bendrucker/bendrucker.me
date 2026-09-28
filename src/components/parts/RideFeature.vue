<script setup lang="ts">
import RouteMap from "@/components/cycling/RouteMap.vue";
import { FEATURE_MAP } from "@/components/cycling/basemap";

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
  /** A square thumbnail. */
  photo?: { url: string; alt: string };
}>();
</script>

<template>
  <!-- The Rides card's lead: the top highlight's map beside its words, so the
       name and figures show within the card's peek at either width. A phone
       insets the photo in the map's corner. Desktop has the room to give it a
       tile of its own between the map and the words.

       The photo is a background on a tile rather than an <img>. Nothing
       hydrates this markup, so an image that fails to load could not hide
       itself, and would draw a broken-image glyph over the map. -->
  <a
    :href="href"
    class="group/feature -mx-1.5 flex min-w-0 items-center gap-3 rounded-lg p-1.5 text-foreground no-underline hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cat focus-visible:outline-solid md:gap-4"
  >
    <span
      v-if="route"
      class="relative block w-[120px] flex-none overflow-hidden rounded-lg md:w-[176px]"
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
      <span
        v-if="photo"
        role="img"
        :aria-label="photo.alt"
        class="absolute right-1.5 bottom-1.5 size-9 rotate-3 rounded-md border-2 border-background bg-tile bg-cover bg-center shadow-[0_6px_14px_-6px_var(--shadow)] md:hidden"
        :style="{ backgroundImage: `url(${photo.url})` }"
      />
    </span>
    <span
      v-if="photo"
      role="img"
      :aria-label="photo.alt"
      class="size-[90px] flex-none rounded-lg bg-tile bg-cover bg-center md:size-[132px]"
      :class="route ? 'max-md:hidden' : ''"
      :style="{ backgroundImage: `url(${photo.url})` }"
    />
    <span class="flex min-w-0 flex-col gap-1">
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
  </a>
</template>
