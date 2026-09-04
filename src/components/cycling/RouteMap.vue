<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { mapImageUrl } from "./basemap";
import { decodePolyline, fitRoute } from "./geo";

const props = defineProps<{
  /** The ride the basemap is rendered for. See `Ride.id`. */
  id?: string;
  /** The ride's track as an encoded polyline. See `Ride.route`. */
  route?: string;
  width: number;
  height: number;
  label?: string;
}>();

const coordinates = computed(() =>
  props.route ? decodePolyline(props.route) : [],
);

const hasRoute = computed(() => coordinates.value.length >= 2);

const fitted = computed(() =>
  fitRoute(coordinates.value, props.width, props.height),
);

/**
 * Both themes are addressed up front and swapped with CSS. The site's theme is
 * an attribute a reader can toggle, so a `prefers-color-scheme` source would
 * follow the operating system straight past that choice.
 */
const basemaps = computed(() => {
  const { id, route, width, height } = props;
  if (id === undefined || route === undefined || !hasRoute.value) return null;
  return {
    light: mapImageUrl(id, route, width, height, "light"),
    dark: mapImageUrl(id, route, width, height, "dark"),
  };
});

/**
 * The route line is the content and the card stands on its own without a
 * basemap, so a size the worker will not render, or a ride whose images have
 * not been generated, leaves the line on the card's own ground. The story
 * book renders every card this way.
 */
const failed = ref(false);
watch(basemaps, () => {
  failed.value = false;
});
</script>

<template>
  <div
    class="relative overflow-hidden bg-muted text-accent"
    :style="{ width: `${width}px`, height: `${height}px` }"
  >
    <template v-if="basemaps && !failed">
      <img
        v-for="(src, theme) in basemaps"
        :key="theme"
        :src="src"
        alt=""
        aria-hidden="true"
        loading="lazy"
        @error="failed = true"
        :width="width"
        :height="height"
        class="absolute inset-0"
        :class="theme === 'dark' ? 'hidden dark:block' : 'dark:hidden'"
      />
    </template>
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
