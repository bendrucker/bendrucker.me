<script setup lang="ts">
import { gutterCopies, type GutterMarks } from "@/activity/gutter";
import TimelineGutter from "./TimelineGutter.vue";

defineProps<{
  /** The row's marks at each width, from `markGutters`. */
  row: { phoneOnly: boolean; phone: GutterMarks; desktop: GutterMarks };
  day: string;
}>();
</script>

<template>
  <!-- A phone-only row never reaches a desktop, so it draws one gutter. -->
  <TimelineGutter
    v-for="copy in gutterCopies(
      row.phone,
      row.phoneOnly ? row.phone : row.desktop,
    )"
    :key="copy.key"
    :class="copy.class"
    :day="day"
    :show-day="copy.marks.showDay"
    :week-end="copy.marks.weekEnd"
  />
</template>
