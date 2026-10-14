<script setup lang="ts">
withDefaults(
  defineProps<{
    /** The day of the month, shown on the first row of a day. */
    day?: string;
    /** The month under the day, for a section that isn't already a month. */
    sub?: string;
    showDay?: boolean;
    /** Stops the line at this row, so it breaks between weeks. */
    weekEnd?: boolean;
  }>(),
  { showDay: true, weekEnd: false },
);
</script>

<template>
  <span
    aria-hidden="true"
    class="relative flex w-[26px] flex-none flex-col items-center self-stretch pt-3 font-mono text-dim"
  >
    <!-- An element rather than a pseudo-element, which contrast checkers
         can't see past to the labels' own ground. -->
    <span
      class="absolute top-0 left-1/2 w-px -translate-x-1/2 bg-cat/22"
      :class="weekEnd ? 'bottom-0' : '-bottom-1.5'"
    />
    <template v-if="showDay && day !== undefined">
      <!-- The month's glyphs overhang its box by a pixel, so a pixel of the
           day's bottom padding moves under the month to keep them in it. -->
      <b
        class="relative tint-5 pt-0.5 pb-px text-xs leading-none font-normal tabular-nums"
        >{{ day }}</b
      >
      <i
        v-if="sub"
        class="relative tint-5 pt-px pb-0.5 text-[9px] leading-none not-italic"
        >{{ sub }}</i
      >
    </template>
  </span>
</template>
