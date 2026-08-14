<script setup lang="ts">
import { toRef } from "vue";
import type { Units } from "./types";
import { provideUnits } from "./useUnits";

const props = defineProps<{ units: Units }>();

provideUnits(toRef(props, "units"));
</script>

<template>
  <slot />
</template>
