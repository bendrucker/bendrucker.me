<script setup lang="ts">
import { computed } from "vue";
import { decodeProfile } from "./profile";

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 30;

const props = defineProps<{
  /** The ride's elevation samples, encoded. See `Ride.elevationProfile`. */
  profile: string;
}>();

const samples = computed(() => decodeProfile(props.profile));

/**
 * A tenth of a view unit, which is a sixth of a pixel at the height the chart
 * draws at. A second decimal costs a character per sample and moves a point by
 * less than a display can show.
 */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

const path = computed(() => {
  const points = samples.value;
  if (points.length === 0) return "";

  // A lone sample has no gradient to draw, so it spans the width as a level
  // band. Dividing by its index would instead pin it to the left edge and
  // render a wedge, reading as a descent the ride never made.
  if (points.length === 1) {
    const y = round((1 - points[0]) * VIEW_HEIGHT);
    return `M0 ${VIEW_HEIGHT}L0 ${y}L${VIEW_WIDTH} ${y}L${VIEW_WIDTH} ${VIEW_HEIGHT}Z`;
  }

  const lastIndex = points.length - 1;
  const ridge = points
    .map((sample, index) => {
      const x = round((index / lastIndex) * VIEW_WIDTH);
      return `L${x} ${round((1 - sample) * VIEW_HEIGHT)}`;
    })
    .join("");

  return `M0 ${VIEW_HEIGHT}${ridge}L${VIEW_WIDTH} ${VIEW_HEIGHT}Z`;
});
</script>

<template>
  <svg
    v-if="path"
    class="block w-full"
    :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="path" class="fill-accent/10" />
  </svg>
</template>
