<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from "vue";
import EmptyState from "@/components/parts/EmptyState.vue";
import ItemRow from "@/components/parts/ItemRow.vue";
import SectionHead from "@/components/parts/SectionHead.vue";
import { KIND_ICONS } from "@/components/parts/icons";
import { category } from "@/categories";
import type { MediaCategory, MediaRow } from "@/media/types";
import { buildMediaView } from "@/media/view";
import { useMediaFilters, type MediaState } from "./filters";
import PosterShelf from "./PosterShelf.vue";
import RecordShelf from "./RecordShelf.vue";

const props = defineProps<{
  id: MediaCategory;
  /** Every row, newest first. */
  rows: readonly MediaRow[];
  /** The highlights, in rank order. */
  highlightKeys: readonly string[];
  /** The filters the server rendered from the URL, and how many rows they match. */
  initial: MediaState;
  /** The current year, which season headings leave unsaid. */
  thisYear: string;
}>();

const cat = computed(() => category(props.id));
const filters = useMediaFilters(props.id, props.initial);

const view = computed(() =>
  buildMediaView(props.rows, props.highlightKeys, {
    q: filters.q,
    type: filters.type,
    active: filters.active,
    thisYear: props.thisYear,
  }),
);

watch(
  () => view.value.count,
  (count) => {
    filters.count = count;
  },
);

const list = useTemplateRef<HTMLElement>("list");

/** Clearing from the empty state removes its button, so focus moves to the list it brings back. */
async function reset() {
  filters.q = "";
  filters.type = "";
  filters.active = false;
  await nextTick();
  list.value?.focus();
}

function rowProps(row: MediaRow) {
  const shared = {
    href: row.url,
    via: row.via,
    title: row.title,
    text: row.text,
    note: row.note,
    query: filters.q,
    leadLabel: row.type,
  };
  if (props.id === "reading") {
    return { ...shared, lead: "kind" as const, kind: KIND_ICONS[row.type] };
  }
  if (props.id === "watching") {
    return {
      ...shared,
      lead: "poster" as const,
      art: row.art,
      ticks: row.ticks,
      tickLabel: row.tickLabel,
    };
  }
  return {
    ...shared,
    lead: "sleeve" as const,
    art: row.art,
    podcast: row.type === "Podcast",
  };
}
</script>

<template>
  <div ref="list" tabindex="-1" class="outline-none">
    <section
      v-if="view.highlights.length"
      aria-labelledby="media-favorites"
      class="pb-8"
    >
      <SectionHead id="media-favorites" label="Favorites" section />
      <PosterShelf v-if="id === 'watching'" :items="view.highlights" />
      <RecordShelf v-else-if="id === 'listening'" :items="view.highlights" />
      <ul v-else class="flex flex-col gap-2">
        <li
          v-for="row in view.highlights"
          :key="row.key"
          :class="row.desktopOnly ? 'max-md:hidden' : ''"
        >
          <ItemRow v-bind="rowProps(row)" />
        </li>
      </ul>
    </section>

    <SectionHead v-if="view.sections.length" label="Recent" section />

    <section
      v-for="section in view.sections"
      :key="section.key"
      :aria-labelledby="`media-${section.key}`"
      :class="section.phoneOnly ? 'md:hidden' : ''"
    >
      <SectionHead
        :id="`media-${section.key}`"
        :label="section.label"
        :level="3"
        :gutter="false"
      />
      <ul class="flex flex-col gap-2">
        <template v-for="week in section.weeks" :key="week.key">
          <li
            v-for="row in week.rows"
            :key="row.item.key"
            :class="row.item.phoneOnly ? 'md:hidden' : ''"
          >
            <ItemRow v-bind="rowProps(row.item)" />
          </li>
        </template>
      </ul>
    </section>

    <EmptyState
      v-if="view.empty"
      :noun="cat.noun"
      :query="filters.q.trim()"
      @clear="reset"
    />
  </div>
</template>
