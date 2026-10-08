<script setup lang="ts">
import { desktopOnly } from "@/activity/highlights";
import type { PartIcon } from "./icons";
import ItemRow, { type RowLead } from "./ItemRow.vue";
import SectionHead from "./SectionHead.vue";

/** The `ItemRow` props a highlight renders with. */
export interface HighlightRow {
  href: string;
  title: string;
  org?: string;
  text?: string;
  note?: string;
  lead?: RowLead;
  kind?: PartIcon;
  leadLabel?: string;
  dot?: string;
  figure?: string;
  hilly?: boolean;
  via?: string;
  query?: string;
}

withDefaults(
  defineProps<{
    rows: readonly HighlightRow[];
    label?: string;
    /** Names the heading, for a section that labels itself by it. */
    headingId?: string;
  }>(),
  { label: "Highlights", headingId: undefined },
);
</script>

<template>
  <SectionHead :id="headingId" :label="label" section />
  <ul class="flex flex-col gap-1.5">
    <li
      v-for="(row, i) in rows"
      :key="row.href"
      :class="desktopOnly(i) ? 'max-md:hidden' : ''"
    >
      <ItemRow v-bind="row" />
    </li>
  </ul>
</template>
