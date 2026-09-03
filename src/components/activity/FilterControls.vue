<script setup lang="ts">
import { computed } from "vue";
import {
  ToggleGroupItem,
  ToggleGroupRoot,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from "reka-ui";
import {
  OWNER_FILTERS,
  SORT_ORDERS,
  type FilterState,
  type SortOrder,
} from "@/activity/types";
import ActivityIcon from "./ActivityIcon.vue";

const SORT_LABELS: Record<SortOrder, string> = {
  recent: "Recent",
  active: "Most active",
  stars: "Stars",
  name: "Name",
};

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
    (!props.yearPage && props.filters.year !== null),
);

const countLabel = computed(() => {
  if (props.repoCount === props.total) return `${props.total} repos`;
  return `${props.repoCount} / ${props.total} repos`;
});

function setOwner(owner: FilterState["owner"]) {
  emit("update:filters", { owner, language: null });
}

/**
 * A single-select toggle group can also report `undefined`, which is how it
 * represents clicking the already-pressed item back off. That has no
 * meaning here since one owner is always selected, so it is ignored rather
 * than forwarded to `setOwner`.
 */
function onOwnerChange(value: unknown) {
  const owner = OWNER_FILTERS.find((candidate) => candidate === value);
  if (owner) setOwner(owner);
}

function setSort(event: Event) {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) return;

  const sort = SORT_ORDERS.find((order) => order === select.value);
  if (sort) emit("update:filters", { sort });
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
    <TooltipProvider>
      <ToggleGroupRoot
        type="single"
        :model-value="filters.owner"
        class="flex items-center gap-2"
        @update:model-value="onOwnerChange"
      >
        <ToggleGroupItem
          value="all"
          :class="
            filters.owner === 'all'
              ? 'border-accent bg-accent text-background'
              : 'border-border text-foreground hover:border-accent'
          "
          class="flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-colors"
        >
          All
        </ToggleGroupItem>

        <TooltipRoot>
          <TooltipTrigger as-child>
            <ToggleGroupItem
              value="personal"
              :class="
                filters.owner === 'personal'
                  ? 'border-accent bg-accent text-background'
                  : 'border-border text-foreground hover:border-accent'
              "
              class="flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors"
            >
              <ActivityIcon name="user" />
              <span class="hidden sm:inline">Personal</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              :side-offset="4"
              class="z-10 rounded-lg border border-border bg-background px-2 py-1 text-xs shadow-lg"
            >
              Personal repositories
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>

        <TooltipRoot>
          <TooltipTrigger as-child>
            <ToggleGroupItem
              value="external"
              :class="
                filters.owner === 'external'
                  ? 'border-accent bg-accent text-background'
                  : 'border-border text-foreground hover:border-accent'
              "
              class="flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors"
            >
              <ActivityIcon name="users" />
              <span class="hidden sm:inline">External</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent
              :side-offset="4"
              class="z-10 rounded-lg border border-border bg-background px-2 py-1 text-xs shadow-lg"
            >
              External / organization repositories
            </TooltipContent>
          </TooltipPortal>
        </TooltipRoot>
      </ToggleGroupRoot>
    </TooltipProvider>
    <span class="ml-auto flex items-center gap-1.5 text-xs text-foreground/50">
      <button
        v-if="hasActiveFilter"
        class="text-foreground/40 transition-colors hover:text-foreground"
        aria-label="Reset filters"
        @click="resetFilters"
      >
        <ActivityIcon name="x" />
      </button>
      <span aria-live="polite">{{ countLabel }}</span>
    </span>
  </nav>

  <div class="flex items-center gap-2">
    <div class="relative flex-1">
      <ActivityIcon
        name="search"
        class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-foreground/40"
      />
      <input
        type="text"
        :value="filters.search"
        placeholder="Search"
        aria-label="Search repositories"
        class="w-full rounded-md border border-border bg-background py-2 pr-3 pl-9 text-sm text-foreground placeholder:text-foreground/40 focus:border-accent focus:outline-none"
        @input="
          emit('update:filters', {
            search: ($event.target as HTMLInputElement).value,
          })
        "
        @keydown.escape="emit('update:filters', { search: '' })"
      />
    </div>
    <div class="relative flex-shrink-0">
      <ActivityIcon
        name="arrow-down-narrow-wide"
        class="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-foreground/40"
      />
      <select
        :value="filters.sort"
        aria-label="Sort order"
        class="h-9 cursor-pointer appearance-none rounded-md border border-border bg-background pr-6 pl-7 text-sm text-foreground/70 focus:border-accent focus:outline-none"
        @change="setSort"
      >
        <option v-for="order in SORT_ORDERS" :key="order" :value="order">
          {{ SORT_LABELS[order] }}
        </option>
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
