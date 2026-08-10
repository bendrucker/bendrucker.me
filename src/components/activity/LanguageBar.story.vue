<script setup lang="ts">
import { ref } from "vue";
import type { Language } from "@/activity/types";
import LanguageBar from "./LanguageBar.vue";

const languages: Language[] = [
  { name: "TypeScript", color: "#3178c6", extension: ".ts", count: 84 },
  { name: "Go", color: "#00ADD8", extension: ".go", count: 41 },
  { name: "Vue", color: "#41b883", extension: ".vue", count: 19 },
  { name: "HCL", color: "#844FBA", extension: ".hcl", count: 12 },
  { name: "Shell", color: "#89e051", extension: ".sh", count: 4 },
  { name: "Ruby", color: "#701516", extension: ".rb", count: 2 },
  { name: "CSS", color: "#663399", extension: ".css", count: 1 },
  { name: "Dockerfile", color: "#384d54", extension: null, count: 1 },
];

const selected = ref<string | null>(null);
</script>

<template>
  <Story
    title="Activity/Language bar"
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Interactive">
      <LanguageBar
        :languages="languages"
        :selected-language="selected"
        @select="selected = $event"
      />
    </Variant>

    <Variant title="Selected">
      <LanguageBar :languages="languages" selected-language="Go" />
    </Variant>

    <Variant title="Single language">
      <LanguageBar :languages="[languages[0]!]" :selected-language="null" />
    </Variant>

    <Variant title="Empty">
      <LanguageBar :languages="[]" :selected-language="null" />
    </Variant>
  </Story>
</template>
