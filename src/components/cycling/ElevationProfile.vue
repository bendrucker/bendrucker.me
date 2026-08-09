<script setup lang="ts">
import { computed } from "vue";

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 30;

const props = defineProps<{ samples: number[] }>();

const path = computed(() => {
  const { samples } = props;
  if (samples.length === 0) return "";

  const lastIndex = Math.max(1, samples.length - 1);
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
