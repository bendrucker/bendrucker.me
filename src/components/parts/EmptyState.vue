<script setup lang="ts">
import { useTemplateRef } from "vue";

withDefaults(
  defineProps<{
    /** What the route lists: "rides". */
    noun: string;
    query?: string;
    /** Indents past the timeline gutter, to line up under the rows. */
    gutter?: boolean;
  }>(),
  { query: "", gutter: true },
);

const emit = defineEmits<{ clear: [] }>();

const heading = useTemplateRef<HTMLElement>("heading");

/** Moves focus here once a search empties the list, so it isn't lost with the rows. */
function focus() {
  heading.value?.focus();
}

defineExpose({ focus });
</script>

<template>
  <div
    class="flex flex-col items-start gap-1.5 py-6"
    :class="gutter ? 'pl-[34px]' : 'pl-1'"
  >
    <p
      ref="heading"
      tabindex="-1"
      class="max-w-full text-[15px] wrap-anywhere outline-none"
    >
      <template v-if="query">No {{ noun }} match “{{ query }}”.</template>
      <template v-else>No {{ noun }} match these filters.</template>
    </p>
    <p class="text-sm text-dim">
      {{
        query
          ? "Search looks at titles, descriptions, and notes."
          : "Try fewer filters."
      }}
    </p>
    <button
      type="button"
      class="mt-2 inline-flex min-h-9 items-center rounded-[10px] border border-line px-3 text-[13px] transition-colors hover:border-cat/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cat"
      @click="emit('clear')"
    >
      Clear search and filters
    </button>
  </div>
</template>
