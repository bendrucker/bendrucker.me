<script setup lang="ts" generic="T extends Listed & { key: string }">
import type { GutteredSection, Guttered, Listed } from "@/activity/gutter";
import SectionHead from "./SectionHead.vue";

withDefaults(
  defineProps<{
    sections: readonly GutteredSection<T>[];
    /**
     * Whether rows draw their day in a gutter. A list that keeps its dates
     * private turns it off, and its headings sit at the rows' edge.
     */
    dated?: boolean;
  }>(),
  { dated: true },
);

defineSlots<{
  /** One row: an `ItemRow`, with a `RowGutter` in its gutter while `dated`. */
  row(props: { item: Guttered<T>; dayNum: string; dated: boolean }): unknown;
}>();
</script>

<template>
  <!-- Each month is a jump target for the date rail, which finds it by
       `data-month-key` and focuses it after scrolling. -->
  <section
    v-for="section in sections"
    :id="`month-${section.key}`"
    :key="section.key"
    :data-month-key="section.key"
    :aria-label="section.label"
    tabindex="-1"
    class="scroll-mt-16 outline-none md:scroll-mt-6 md:sidebar-collapsed:scroll-mt-16"
    :class="section.phoneOnly ? 'md:hidden' : ''"
  >
    <SectionHead :label="section.label" :level="3" :gutter="dated" />
    <div class="flex flex-col gap-1.5">
      <ul
        v-for="week in section.weeks"
        :key="week.key"
        class="flex flex-col gap-1.5"
      >
        <li
          v-for="{ item, dayNum } in week.rows"
          :key="item.key"
          :class="item.phoneOnly ? 'md:hidden' : ''"
        >
          <slot name="row" :item="item" :day-num="dayNum" :dated="dated" />
        </li>
      </ul>
    </div>
  </section>
</template>
