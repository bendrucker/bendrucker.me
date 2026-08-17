<script setup lang="ts">
import { logEvent } from "histoire/client";
import type { Language } from "@/activity/types";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import LanguageBar from "./LanguageBar.vue";

const everyLanguage: Language[] = [
  { name: "TypeScript", color: "#3178c6", extension: ".ts", count: 84 },
  { name: "Go", color: "#00ADD8", extension: ".go", count: 41 },
  { name: "Vue", color: "#41b883", extension: ".vue", count: 19 },
  { name: "HCL", color: "#844FBA", extension: ".hcl", count: 12 },
  { name: "Shell", color: "#89e051", extension: ".sh", count: 4 },
  { name: "Ruby", color: "#701516", extension: ".rb", count: 2 },
  { name: "CSS", color: "#663399", extension: ".css", count: 1 },
  { name: "Dockerfile", color: "#384d54", extension: null, count: 1 },
];

const languageSets: Record<string, Language[]> = {
  every: everyLanguage,
  single: everyLanguage.slice(0, 1),
  none: [],
};

const selectable = {
  "": "nothing selected",
  ...Object.fromEntries(everyLanguage.map(({ name }) => [name, name])),
};

const controls: StoryControlSet = {
  languages: {
    type: "select",
    title: "languages",
    options: {
      every: "eight languages",
      single: "one language",
      none: "no languages",
    },
  },
  selected: { type: "select", title: "selected", options: selectable },
};

function initState() {
  return { languages: "every", selected: "" };
}
</script>

<template>
  <Story
    title="Language bar"
    group="code"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
    :init-state="initState"
  >
    <Variant title="Language bar">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <LanguageBar
          :languages="languageSets[state.languages]!"
          :selected-language="state.selected || null"
          @select="
            state.selected = $event ?? '';
            logEvent('select', { language: $event });
          "
        />
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Language bar

The proportional bar of languages above the code activity feed.

Selecting is two-way: tap a segment and the panel follows, or drive it from the
panel. The tail languages are a pixel or two wide, which is the case to check on
a phone.
</docs>
