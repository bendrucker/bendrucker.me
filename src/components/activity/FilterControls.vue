<script setup lang="ts">
import { computed } from "vue";
import type { FilterState } from "./composables/useActivityApi";

const props = defineProps<{
  filters: FilterState;
  total: number;
  repoCount: number;
  yearPage?: boolean;
}>();

const emit = defineEmits<{
  "update:filters": [filters: Partial<FilterState>];
}>();

const hasActiveFilter = computed(
  () =>
    props.filters.owner !== "all" ||
    props.filters.language !== null ||
    props.filters.search !== "" ||
    (!props.yearPage && props.filters.year !== null)
);

const countLabel = computed(() => {
  if (props.repoCount === props.total) return `${props.total} repos`;
  return `${props.repoCount} / ${props.total} repos`;
});

function setOwner(owner: FilterState["owner"]) {
  emit("update:filters", { owner, language: null });
}

function resetFilters() {
  emit("update:filters", {
    owner: "all",
    language: null,
    search: "",
    ...(props.yearPage ? {} : { year: null }),
  });
}
</script>

<template>
  <nav class="flex items-center gap-2" aria-label="Filter repositories">
    <button
      :aria-pressed="(filters.owner === 'all').toString()"
      :class="
        filters.owner === 'all'
          ? 'bg-accent text-background border-accent'
          : 'border-border text-foreground hover:border-accent'
      "
      class="flex items-center h-8 px-3 rounded-full text-sm font-medium border transition-colors"
      @click="setOwner('all')"
    >
      All
    </button>
    <button
      :aria-pressed="(filters.owner === 'personal').toString()"
      :class="
        filters.owner === 'personal'
          ? 'bg-accent text-background border-accent'
          : 'border-border text-foreground hover:border-accent'
      "
      class="flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-medium border transition-colors"
      title="Personal repositories"
      @click="setOwner('personal')"
    >
      <svg
        class="w-3.5 h-3.5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      <span class="hidden sm:inline">Personal</span>
    </button>
    <button
      :aria-pressed="(filters.owner === 'external').toString()"
      :class="
        filters.owner === 'external'
          ? 'bg-accent text-background border-accent'
          : 'border-border text-foreground hover:border-accent'
      "
      class="flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-medium border transition-colors"
      title="External / organization repositories"
      @click="setOwner('external')"
    >
      <svg
        class="w-3.5 h-3.5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <span class="hidden sm:inline">External</span>
    </button>
    <span class="ml-auto flex items-center gap-1.5 text-xs text-foreground/50">
      <button
        v-if="hasActiveFilter"
        class="text-foreground/40 hover:text-foreground transition-colors"
        aria-label="Reset filters"
        @click="resetFilters"
      >
        &times;
      </button>
      <span aria-live="polite">{{ countLabel }}</span>
    </span>
  </nav>

  <div class="flex items-center gap-2">
    <div class="relative flex-1">
      <svg
        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        :value="filters.search"
        placeholder="Search"
        aria-label="Search repositories"
        class="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent"
        @input="
          emit('update:filters', {
            search: ($event.target as HTMLInputElement).value,
          })
        "
        @keydown.escape="emit('update:filters', { search: '' })"
      />
    </div>
    <div class="relative flex-shrink-0">
      <svg
        class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/40 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M11 5h10" />
        <path d="M11 9h7" />
        <path d="M11 13h4" />
        <path d="m3 17 3 3 3-3" />
        <path d="M6 18V4" />
      </svg>
      <select
        :value="filters.sort"
        aria-label="Sort order"
        class="h-9 pl-7 pr-6 text-sm border border-border rounded-md bg-background text-foreground/70 focus:outline-none focus:border-accent appearance-none cursor-pointer"
        @change="
          emit('update:filters', {
            sort: ($event.target as HTMLSelectElement)
              .value as FilterState['sort'],
          })
        "
      >
        <option value="recent">Recent</option>
        <option value="active">Most active</option>
        <option value="stars">Stars</option>
        <option value="name">Name</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 24px;
}
</style>
