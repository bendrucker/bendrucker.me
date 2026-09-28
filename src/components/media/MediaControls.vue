<script setup lang="ts">
import { computed } from "vue";
import SearchControl from "@/components/parts/SearchControl.vue";
import SegmentGroup from "@/components/parts/SegmentGroup.vue";
import { category } from "@/categories";
import type { MediaCategory } from "@/media/types";
import { typeParam } from "@/media/view";
import { useMediaFilters, type MediaState } from "./filters";

const props = withDefaults(
  defineProps<{
    id: MediaCategory;
    /** The filters the server rendered from the URL, and how many rows they match. */
    initial: MediaState;
    /** Lays the controls out for the desktop sidebar, which is narrower. */
    sidebar?: boolean;
  }>(),
  { sidebar: false },
);

const cat = computed(() => category(props.id));
const types = computed(() => cat.value.types ?? []);

const filters = useMediaFilters(props.id, props.initial);

/** Reka's radio group can't hold an empty value, so "All" stands in for it. */
const ALL = "all";

const options = computed(() => [
  { value: ALL, label: "All" },
  ...types.value.map((t) => ({ value: t.value, label: t.label })),
]);

const type = computed({
  get: () => (filters.type === "" ? ALL : filters.type),
  set: (value: string) => {
    filters.type = value === ALL ? "" : value;
  },
});

const q = computed({
  get: () => filters.q,
  set: (value: string) => {
    filters.q = value;
  },
});

const status = computed(() => {
  if (filters.q.trim() === "") return "";
  return filters.count === 1 ? "1 match" : `${filters.count} matches`;
});
</script>

<template>
  <!--
    Without a script the field submits as a plain form, and the server renders
    the result. The sidebar is too narrow for equal thirds to hold "Podcasts",
    so there each segment starts from its label's width and shares what is left.
  -->
  <form
    method="get"
    role="search"
    :action="cat.route"
    class="tool-row w-full"
    @submit.prevent
  >
    <input
      v-if="filters.type"
      type="hidden"
      name="type"
      :value="typeParam(types, filters.type)"
    />
    <SegmentGroup
      v-model="type"
      :options="options"
      :label="`${cat.name} type`"
      fill
      class="min-w-0 flex-1"
      :class="sidebar ? '*:basis-auto' : ''"
    />
    <SearchControl v-model="q" :noun="cat.noun" :status="status" collapsible />
  </form>
</template>
