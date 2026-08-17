<script setup lang="ts">
import { computed } from "vue";

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 30;

const props = defineProps<{ samples: number[] }>();

const path = computed(() => {
  const { samples } = props;
  if (samples.length === 0) return "";

  // A lone sample has no gradient to draw, so it spans the width as a level
  // band. Dividing by its index would instead pin it to the left edge and
  // render a wedge, reading as a descent the ride never made.
  if (samples.length === 1) {
    const y = ((1 - samples[0]) * VIEW_HEIGHT).toFixed(2);
    return `M0 ${VIEW_HEIGHT}L0 ${y}L${VIEW_WIDTH} ${y}L${VIEW_WIDTH} ${VIEW_HEIGHT}Z`;
  }

  const lastIndex = samples.length - 1;
  const ridge = samples
    .map((sample, index) => {
      const x = ((index / lastIndex) * VIEW_WIDTH).toFixed(2);
      const y = ((1 - sample) * VIEW_HEIGHT).toFixed(2);
      return `L${x} ${y}`;
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
