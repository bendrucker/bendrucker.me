<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { julyMonth, rankedLists } from "./fixtures";
import * as format from "./format";
import SectionHeading from "./SectionHeading.vue";
import { iconNames } from "./types";

const monthSummary = format.formatMonthSummary(julyMonth, "imperial");

const iconOptions = {
  "": "no icon",
  ...Object.fromEntries(iconNames.map((name) => [name, name])),
};

const controls: StoryControlSet = {
  label: { type: "text", title: "label" },
  summary: { type: "text", title: "summary" },
  icon: { type: "select", title: "icon", options: iconOptions },
  as: {
    type: "select",
    title: "as",
    options: ["h2", "h3", "h4", "p", "span"],
  },
  width: { type: "slider", title: "width", min: 200, max: 720 },
};

function initState() {
  return {
    label: julyMonth.label,
    summary: monthSummary,
    icon: "",
    as: "h2",
    width: 358,
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
        <PreviewControls :controls="controls" :state="state" />
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
        <PanelControls :controls="controls" :state="state" />
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
