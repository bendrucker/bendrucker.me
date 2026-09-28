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
    /**
     * Starts the search as a button beside the segment, for a phone's tool
     * row. The sidebar has room for the field and too little for both on one
     * line.
     */
    collapsible?: boolean;
  }>(),
  { collapsible: true },
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
    The type segment fills the row with the search button beside it. Opening
    the search gives the field a row of its own above the segment. Without a
    script the field submits as a plain form, and the server renders the
    result.

    The sidebar is too narrow for equal thirds to hold "Podcasts", so there
    each segment starts from its label's width and shares what is left.
  -->
  <form
    method="get"
    role="search"
    :action="cat.route"
    class="flex w-full min-w-0 items-center gap-2 has-[input[type=search]]:flex-col-reverse has-[input[type=search]]:items-stretch"
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
      :class="collapsible ? '' : '*:basis-auto'"
    />
    <SearchControl
      v-model="q"
      :noun="cat.noun"
      :status="status"
      :collapsible="collapsible"
    />
  </form>
</template>
