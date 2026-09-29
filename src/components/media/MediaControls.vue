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

function toggleActive() {
  filters.active = !filters.active;
}

const status = computed(() => {
  if (filters.q.trim() === "") return "";
  return filters.count === 1 ? "1 match" : `${filters.count} matches`;
});
</script>

<template>
  <!--
    Without a script the field submits as a plain form, and the server renders
    the result. In the sidebar the types stack as a list under the search, as
    the Rides view switch does, which leaves room for a type to be added.
  -->
  <form
    method="get"
    role="search"
    :action="cat.route"
    :class="sidebar ? 'flex flex-col gap-4' : 'tool-row w-full'"
    @submit.prevent
  >
    <input
      v-if="filters.type"
      type="hidden"
      name="type"
      :value="typeParam(types, filters.type)"
    />
    <input v-if="filters.active" type="hidden" name="active" value="1" />
    <template v-if="sidebar">
      <div class="tool-row">
        <SearchControl
          v-model="q"
          :noun="cat.noun"
          :status="status"
          collapsible
          class="ml-auto"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <p class="px-1 label-caps">Type</p>
        <SegmentGroup
          v-model="type"
          :options="options"
          :label="`${cat.name} type`"
          list
        />
      </div>
      <div v-if="cat.progress" class="flex flex-col gap-1.5">
        <p class="px-1 label-caps">Status</p>
        <button
          type="button"
          :aria-pressed="filters.active"
          class="inline-flex min-h-9 items-center gap-2 rounded-[7px] px-2.5 text-sm text-dim transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cat aria-pressed:bg-background aria-pressed:text-cat aria-pressed:shadow-[0_1px_2px_var(--shadow)]"
          @click="toggleActive"
        >
          <span
            aria-hidden="true"
            class="size-4"
            :class="
              filters.active
                ? 'icon-[lucide--square-check]'
                : 'icon-[lucide--square]'
            "
          />
          {{ cat.progress }}
        </button>
      </div>
    </template>
    <template v-else>
      <SegmentGroup
        v-model="type"
        :options="options"
        :label="`${cat.name} type`"
        fill
        class="min-w-0 flex-1"
      />
      <button
        v-if="cat.progress"
        type="button"
        :aria-pressed="filters.active"
        :aria-label="cat.progress"
        :title="cat.progress"
        class="inline-flex size-9 flex-none items-center justify-center rounded-[10px] text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cat aria-pressed:bg-foreground/6 aria-pressed:text-cat"
        @click="toggleActive"
      >
        <span aria-hidden="true" class="size-4 icon-[lucide--circle-dashed]" />
      </button>
      <SearchControl
        v-model="q"
        :noun="cat.noun"
        :status="status"
        collapsible
      />
    </template>
  </form>
</template>
