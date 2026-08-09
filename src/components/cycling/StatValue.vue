<script setup lang="ts">
withDefaults(
  defineProps<{
    value: string;
    unit?: string;
    size?: "sm" | "md" | "lg";
    /**
     * Names what the number measures. The design leaves stats unlabelled and
     * lets the unit carry the meaning, which reads as a bare run of numbers to
     * anything consuming the accessibility tree.
     */
    label?: string;
  }>(),
  { size: "md" },
);

const sizeClass = {
  sm: "text-[16px]",
  md: "text-[24px]",
  lg: "text-[28px]",
};
</script>

<template>
  <span
    class="font-sans leading-none font-extrabold tracking-tight"
    :class="sizeClass[size]"
  >
    <span v-if="label" class="sr-only">{{ label }} </span>{{ value
    }}<span v-if="unit" class="text-xs font-semibold text-foreground/55"
      >&nbsp;{{ unit }}</span
    >
  </span>
</template>
