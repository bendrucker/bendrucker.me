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
    class="relative flex w-[26px] flex-none flex-col items-center self-stretch pt-3 font-mono text-dim before:absolute before:top-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-cat/22"
    :class="weekEnd ? 'before:bottom-0' : 'before:-bottom-1.5'"
  >
    <template v-if="showDay && day !== undefined">
      <b
        class="relative tint-5 py-0.5 text-xs leading-none font-normal tabular-nums"
        >{{ day }}</b
      >
      <i
        v-if="sub"
        class="relative tint-5 pb-0.5 text-[9px] leading-none not-italic"
        >{{ sub }}</i
      >
    </template>
  </span>
</template>
