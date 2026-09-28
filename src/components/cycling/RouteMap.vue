<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { mapImageUrl } from "./basemap";
import { decodePolyline, fitRoute } from "./geo";

const props = withDefaults(
  defineProps<{
    /** The ride the basemap is rendered for. See `Ride.id`. */
    id?: string;
    /** The ride's track as an encoded polyline. See `Ride.route`. */
    route?: string;
    width: number;
    height: number;
    label?: string;
    /**
     * Scales to its container's width at the `width` by `height` shape, rather
     * than standing at that size. The basemap is still rendered at the size
     * named, so the two only part ways by the container's rounding.
     */
    fluid?: boolean;
    /** Stands on the category's tint with the line in `--cat`, as a ride page's hero. */
    tint?: boolean;
    strokeWidth?: number;
  }>(),
  { fluid: false, tint: false, strokeWidth: 2 },
);

const box = computed(() =>
  props.fluid
    ? { width: "100%", aspectRatio: `${props.width} / ${props.height}` }
    : { width: `${props.width}px`, height: `${props.height}px` },
);

const coordinates = computed(() =>
  props.route ? decodePolyline(props.route) : [],
);

const hasRoute = computed(() => coordinates.value.length >= 2);

const fitted = computed(() =>
  fitRoute(coordinates.value, props.width, props.height),
);

type Theme = "light" | "dark";

interface BasemapImage {
  /** The 1x URL, for a browser that ignores `srcset`. */
  src: string;
  srcset: string;
}

/**
 * Both themes are addressed up front and swapped with CSS. The site's theme is
 * an attribute a reader can toggle, so a `prefers-color-scheme` source would
 * follow the operating system straight past that choice. That costs a card two
 * image requests where it shows one, which buys a toggle that needs no
 * JavaScript and no round trip.
 */
const basemaps = computed<Record<Theme, BasemapImage> | null>(() => {
  const { id, route, width, height } = props;
  if (id === undefined || route === undefined || !hasRoute.value) return null;

  const forTheme = (theme: Theme): BasemapImage => {
    const src = mapImageUrl({ id, route, width, height, theme, scale: 1 });
    const src2x = mapImageUrl({ id, route, width, height, theme, scale: 2 });
    return { src, srcset: `${src} 1x, ${src2x} 2x` };
  };

  return { light: forTheme("light"), dark: forTheme("dark") };
});

/**
 * The route line is the content and the card stands on its own without a
 * basemap, so a size the worker will not render, or a ride whose images have
 * not been generated, leaves the line on the card's own ground. The story
 * book renders every card this way.
 *
 * Tracked per theme, since the two are separate requests and one failing says
 * nothing about the other.
 */
const failed = ref<Record<Theme, boolean>>({ light: false, dark: false });
watch(basemaps, () => {
  failed.value = { light: false, dark: false };
});
</script>

<template>
  <div
    class="relative overflow-hidden"
    :class="tint ? 'tint-7 text-cat' : 'bg-muted text-accent'"
    :style="box"
  >
    <template v-if="basemaps">
      <img
        v-for="(image, theme) in basemaps"
        v-show="!failed[theme]"
        :key="theme"
        :src="image.src"
        :srcset="image.srcset"
        alt=""
        aria-hidden="true"
        loading="lazy"
        @error="failed[theme] = true"
        :width="width"
        :height="height"
        class="absolute inset-0"
        :class="[
          theme === 'dark' ? 'hidden dark:block' : 'dark:hidden',
          fluid ? 'size-full' : '',
        ]"
      />
    </template>
    <svg
      v-if="hasRoute"
      class="absolute inset-0"
      :viewBox="`0 0 ${width} ${height}`"
      :width="fluid ? '100%' : width"
      :height="fluid ? '100%' : height"
      role="img"
      :aria-label="label ?? 'Route map'"
    >
      <path
        :d="fitted.path"
        fill="none"
        stroke="currentColor"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>
