<script setup lang="ts">
import { julyMonth, rankedLists } from "./fixtures";
import * as format from "./format";
import SectionHeading from "./SectionHeading.vue";

const monthSummary = format.formatMonthSummary(julyMonth, "imperial");

function initState() {
  return {
    label: julyMonth.label,
    summary: monthSummary,
    icon: "",
    as: "h2",
    width: 380,
  };
}
</script>

<template>
  <Story
    title="Section heading"
    group="primitives"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Section heading" :init-state="initState">
      <template #default="{ state }">
        <div :style="{ width: `${state.width}px`, maxWidth: '100%' }">
          <SectionHeading
            :label="state.label"
            :summary="state.summary || undefined"
            :icon="state.icon || undefined"
            :as="state.as"
          />
        </div>
      </template>

      <template #controls="{ state }">
        <HstText v-model="state.label" title="label" />
        <HstText v-model="state.summary" title="summary" />
        <HstText v-model="state.icon" title="icon" />
        <HstSelect
          v-model="state.as"
          title="as"
          :options="['h2', 'h3', 'h4', 'p', 'span']"
        />
        <HstSlider v-model="state.width" title="width" :min="200" :max="720" />
      </template>
    </Variant>

    <Variant title="Stacked sections">
      <div class="flex flex-col gap-6">
        <SectionHeading
          v-for="list in rankedLists.slice(0, 3)"
          :key="list.id"
          :label="list.title"
          :icon="list.icon"
          as="h3"
          :summary="`${list.rows.length} rows`"
        />
      </div>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Section heading

A label, an optional glyph, and a summary that trails it.

`as` is the document outline, not the size: a month is an `h2`, a ranked list
inside it an `h3`, and a panel label that should not enter the outline at all is
a `span`. All four look the same. Narrow the width to see where the summary
drops below the label.
</docs>
