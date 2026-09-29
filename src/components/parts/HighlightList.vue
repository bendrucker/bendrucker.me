<script setup lang="ts">
import { desktopOnly } from "@/activity/highlights";
import ItemRow, { type RowLead } from "./ItemRow.vue";
import SectionHead from "./SectionHead.vue";

/** The `ItemRow` props a highlight renders with. */
export interface HighlightRow {
  href: string;
  title: string;
  org?: string;
  text?: string;
  lead?: RowLead;
  dot?: string;
  figure?: string;
  hilly?: boolean;
}

defineProps<{ rows: readonly HighlightRow[] }>();
</script>

<template>
  <SectionHead label="Highlights" section />
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
