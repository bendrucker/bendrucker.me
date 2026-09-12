<script setup lang="ts">
import { computed } from "vue";
import { languageLabel } from "./language";

/**
 * A repository's primary language in the row's corner as its file
 * extension in the language's own color, the way the language bar labels
 * it: `ts` where a name would take the room a row does not have. The
 * name stays in the title and for screen readers.
 */
const props = defineProps<{
  language: { name: string; color: string; extension: string | null };
}>();

const label = computed(() => languageLabel(props.language));
</script>

<template>
  <span
    class="absolute top-2.5 right-0 text-[0.65rem] leading-none tracking-wide opacity-80"
    :title="language.name"
    :style="{ color: language.color }"
    aria-hidden="true"
  >
    {{ label }}
  </span>
  <span class="sr-only">{{ language.name }}</span>
</template>
