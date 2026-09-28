<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  useTemplateRef,
  watch,
} from "vue";
import { monthsByYear } from "@/activity/sections";
import EmptyState from "@/components/parts/EmptyState.vue";
import ItemRow from "@/components/parts/ItemRow.vue";
import RouteFrame from "@/components/parts/RouteFrame.vue";
import SearchControl from "@/components/parts/SearchControl.vue";
import SectionHead from "@/components/parts/SectionHead.vue";
import SegmentGroup from "@/components/parts/SegmentGroup.vue";
import SelectControl from "@/components/parts/SelectControl.vue";
import TimelineGutter from "@/components/parts/TimelineGutter.vue";
import {
  DEFAULT_FILTERS,
  OWNER_OPTIONS,
  SORT_OPTIONS,
  codeView,
  countLabel,
  gutterCopies,
  ownerFrom,
  parseFilters,
  sortFrom,
  withFilters,
  type CodeFilters,
  type CodeRow,
  type LanguageOption,
} from "@/code/view";

const props = defineProps<{
  rows: readonly CodeRow[];
  languages: readonly LanguageOption[];
  /** The filters the URL named, so the server and the island render alike. */
  initial: CodeFilters;
  /** The year section labels leave unsaid, fixed by the server. */
  thisYear: string;
}>();

const filters = reactive<CodeFilters>({ ...props.initial });

const view = computed(() =>
  codeView(props.rows, filters, { thisYear: props.thisYear }),
);

const languageDot = computed(
  () => props.languages.find((option) => option.value === filters.lang)?.color,
);

const status = computed(() => countLabel(view.value.count));

const sortLabel = computed(
  () => SORT_OPTIONS.find((option) => option.value === filters.sort)?.label,
);

const months = computed(() =>
  view.value.sections.filter((section) => !section.phoneOnly),
);

const rail = computed(() =>
  monthsByYear(months.value.map((section) => section.key)),
);

const results = useTemplateRef<HTMLElement>("results");
const empty = useTemplateRef<InstanceType<typeof EmptyState>>("empty");

// The URL keeps up with the filters, so a reload or a shared link lands on
// the same list. Replacing rather than pushing keeps typing out of history,
// and the router's own state rides along untouched. Writing once on mount
// swaps a language the server matched in another case for the one it chose.
function writeUrl() {
  const search = withFilters(location.search, filters);
  if (search === location.search) return;
  history.replaceState(
    history.state,
    "",
    `${location.pathname}${search}${location.hash}`,
  );
}

// A Back within the page, like one past a month link, doesn't remount the
// island, so the filters follow whatever query the entry carries.
function readUrl() {
  Object.assign(
    filters,
    parseFilters(new URLSearchParams(location.search), props.languages),
  );
}

watch(filters, writeUrl);

onMounted(() => {
  writeUrl();
  window.addEventListener("popstate", readUrl);
});

onBeforeUnmount(() => {
  window.removeEventListener("popstate", readUrl);
});

function setOwner(value: string) {
  filters.owner = ownerFrom(value);
}

function setSort(value: string) {
  filters.sort = sortFrom(value);
}

/**
 * Clearing from the empty state removes the button that had focus, so focus
 * moves to the list it brought back, or to the empty state if nothing did.
 */
async function reset() {
  Object.assign(filters, DEFAULT_FILTERS);
  await nextTick();
  if (view.value.count === 0) empty.value?.focus();
  else results.value?.focus();
}
</script>

<template>
  <RouteFrame
    id="code"
    :regions="{
      tools: true,
      sidebar: true,
      highlights: view.highlights.length > 0,
    }"
  >
    <template #tools>
      <SegmentGroup
        :model-value="filters.owner"
        :options="OWNER_OPTIONS"
        label="Owner"
        size="sm"
        @update:model-value="setOwner"
      />
      <SelectControl
        v-model="filters.lang"
        class="ml-auto min-w-0"
        :options="languages"
        label="Language"
        placeholder="Language"
        :dot="languageDot"
      />
      <SelectControl
        :model-value="filters.sort"
        :options="SORT_OPTIONS"
        label="Sort"
        icon="arrow-down-up"
        icon-only
        :tint="false"
        @update:model-value="setSort"
      />
      <SearchControl
        v-model="filters.q"
        noun="repositories"
        collapsible
        :status="status"
      />
    </template>

    <template #sidebar>
      <div class="tool-row">
        <SegmentGroup
          :model-value="filters.owner"
          :options="OWNER_OPTIONS"
          label="Owner"
          fill
          class="min-w-0 flex-1 *:basis-auto"
          @update:model-value="setOwner"
        />
        <SearchControl
          v-model="filters.q"
          noun="repositories"
          collapsible
          :status="status"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <SelectControl
          v-model="filters.lang"
          class="min-w-0"
          :options="languages"
          label="Language"
          placeholder="Language"
          :dot="languageDot"
        />
        <SelectControl
          :model-value="filters.sort"
          :options="SORT_OPTIONS"
          label="Sort"
          icon="arrow-down-up"
          :tint="false"
          @update:model-value="setSort"
        />
      </div>
      <nav
        v-if="months.length > 1"
        aria-labelledby="code-months"
        class="flex flex-col gap-1"
      >
        <h2 id="code-months" class="sr-only">Months</h2>
        <ul class="flex flex-col gap-3">
          <li v-for="group in rail" :key="group.year">
            <p class="px-1 pb-1 label-caps">{{ group.year }}</p>
            <ul class="flex flex-col">
              <li v-for="section in group.months" :key="section.key">
                <a
                  :href="`#month-${section.key}`"
                  class="block rounded-md px-2.5 py-1.5 font-mono text-[13px] text-foreground/80 no-underline transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-cat"
                >
                  {{ section.label }}
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </template>

    <template #highlights>
      <SectionHead label="Highlights" section />
      <ul class="flex flex-col gap-1.5">
        <li
          v-for="(row, i) in view.highlights"
          :key="row.key"
          :class="i >= 3 ? 'max-md:hidden' : ''"
        >
          <ItemRow
            :href="row.href"
            :title="row.title"
            :org="row.org"
            :text="row.text"
            :lead="row.lead"
            :dot="row.dot"
          />
        </li>
      </ul>
    </template>

    <div
      ref="results"
      role="region"
      aria-label="Repositories"
      tabindex="-1"
      class="outline-none"
    >
      <EmptyState
        v-if="view.count === 0"
        ref="empty"
        noun="repositories"
        :query="filters.q"
        @clear="reset"
      />

      <template v-else-if="filters.sort === 'recent'">
        <SectionHead label="Recent" section />
        <section
          v-for="section in view.sections"
          :id="`month-${section.key}`"
          :key="section.key"
          :aria-label="section.label"
          class="scroll-mt-16 md:scroll-mt-6 md:sidebar-collapsed:scroll-mt-16"
          :class="section.phoneOnly ? 'md:hidden' : ''"
        >
          <SectionHead :label="section.label" :level="3" />
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
                <ItemRow
                  :href="item.href"
                  :title="item.title"
                  :org="item.org"
                  :text="item.text"
                  :lead="item.lead"
                  :dot="item.dot"
                  :query="filters.q"
                >
                  <template #gutter>
                    <TimelineGutter
                      v-for="copy in gutterCopies(
                        item.phone,
                        item.phoneOnly ? item.phone : item.desktop,
                      )"
                      :key="copy.key"
                      :class="copy.class"
                      :day="dayNum"
                      :show-day="copy.marks.showDay"
                      :week-end="copy.marks.weekEnd"
                    />
                  </template>
                </ItemRow>
              </li>
            </ul>
          </div>
        </section>
      </template>

      <section v-else :aria-label="sortLabel">
        <SectionHead :label="sortLabel ?? ''" section />
        <ul class="flex flex-col gap-1.5">
          <li v-for="{ item, dayNum, sub } in view.sorted" :key="item.key">
            <ItemRow
              :href="item.href"
              :title="item.title"
              :org="item.org"
              :text="item.text"
              :lead="item.lead"
              :dot="item.dot"
              :query="filters.q"
            >
              <template #gutter>
                <TimelineGutter :day="dayNum" :sub="sub" week-end />
              </template>
            </ItemRow>
          </li>
        </ul>
      </section>
    </div>
  </RouteFrame>
</template>
