<script setup lang="ts">
import { computed } from "vue";
import { markParts } from "@/activity/search";

const props = withDefaults(defineProps<{ text: string; query?: string }>(), {
  query: "",
});

const parts = computed(() => markParts(props.text, props.query));
</script>

<template>
  <template v-for="(part, i) in parts" :key="i">
    <mark
      v-if="part.hit"
      class="-mx-px rounded-[3px] bg-cat/24 px-px text-inherit"
      >{{ part.text }}</mark
    >
    <template v-else>{{ part.text }}</template>
  </template>
</template>
