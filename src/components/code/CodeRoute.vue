<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { monthShort } from "@/activity/sections";
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
  highlightMarks,
  ownerFrom,
  sortFrom,
  transitionName,
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

// The URL keeps up with the filters, so a reload or a shared link lands on
// the same list. Replacing rather than pushing keeps typing out of history,
// and the router's own state rides along untouched.
watch(filters, () => {
  history.replaceState(
    history.state,
    "",
    `${location.pathname}${withFilters(location.search, filters)}${location.hash}`,
  );
});

function setOwner(value: string) {
  filters.owner = ownerFrom(value);
}

function setSort(value: string) {
  filters.sort = sortFrom(value);
}

function reset() {
  Object.assign(filters, DEFAULT_FILTERS);
}

function dayOfMonth(day: string): string {
  return String(Number(day.slice(8, 10)));
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
      <!-- Search opens into a row of its own above the filters. -->
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <div class="flex min-w-0 grow basis-0 items-center gap-2">
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
        </div>
        <div class="flex has-[input]:order-first has-[input]:basis-full">
          <SearchControl
            v-model="filters.q"
            noun="repositories"
            collapsible
            :status="status"
          />
        </div>
      </div>
    </template>

    <template #sidebar>
      <SearchControl v-model="filters.q" noun="repositories" :status="status" />
      <SegmentGroup
        :model-value="filters.owner"
        :options="OWNER_OPTIONS"
        label="Owner"
        fill
        @update:model-value="setOwner"
      />
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
        <p id="code-months" class="px-1 label-caps">Months</p>
        <ul class="flex flex-col">
          <li v-for="section in months" :key="section.key">
            <a
              :href="`#month-${section.key}`"
              class="block rounded-md px-2.5 py-1.5 font-mono text-[13px] text-foreground/80 no-underline transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-cat"
            >
              {{ section.label }}
            </a>
          </li>
        </ul>
      </nav>
    </template>

    <template #highlights>
      <SectionHead label="Highlights" />
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
            :transition-name="transitionName(row.key)"
          >
            <template #gutter>
              <TimelineGutter
                v-for="copy in gutterCopies(
                  highlightMarks(i, view.highlights.length).phone,
                  highlightMarks(i, view.highlights.length).desktop,
                )"
                :key="copy.key"
                :class="copy.class"
                :day="dayOfMonth(row.day)"
                :sub="monthShort(row.day)"
                :week-end="copy.marks.weekEnd"
              />
            </template>
          </ItemRow>
        </li>
      </ul>
    </template>

    <EmptyState
      v-if="view.count === 0"
      noun="repositories"
      :query="filters.q"
      @clear="reset"
    />

    <template v-else-if="filters.sort === 'recent'">
      <section
        v-for="section in view.sections"
        :id="`month-${section.key}`"
        :key="section.key"
        :aria-label="section.label"
        class="scroll-mt-16 md:scroll-mt-6"
        :class="section.phoneOnly ? 'md:hidden' : ''"
      >
        <SectionHead :label="section.label" />
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
                :transition-name="transitionName(item.key)"
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
      <SectionHead :label="sortLabel ?? ''" />
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
            :transition-name="transitionName(item.key)"
          >
            <template #gutter>
              <TimelineGutter :day="dayNum" :sub="sub" week-end />
            </template>
          </ItemRow>
        </li>
      </ul>
    </section>
  </RouteFrame>
</template>
