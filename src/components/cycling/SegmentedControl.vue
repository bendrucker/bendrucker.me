<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from "reka-ui";
import type { SegmentedOption } from "./types";

withDefaults(
  defineProps<{
    modelValue: string;
    options: SegmentedOption[];
    label: string;
    size?: "sm" | "md";
  }>(),
  { size: "md" },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const sizeClass = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-3 py-1 text-[11px]",
};

const selectedClass = {
  sm: "bg-muted text-foreground",
  md: "bg-foreground text-background font-bold",
};

/**
 * A radio group is what these segments behave like: one of a set is always
 * chosen, and the arrow keys move between them. The payload is typed loosely
 * enough to carry any value, so it is narrowed rather than asserted.
 */
function select(value: unknown) {
  if (typeof value === "string") emit("update:modelValue", value);
}
</script>

<template>
  <RadioGroupRoot
    :model-value="modelValue"
    :aria-label="label"
    orientation="horizontal"
    class="inline-flex divide-x divide-border overflow-hidden rounded-md border border-border"
    @update:model-value="select"
  >
    <RadioGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :aria-label="option.name"
      class="text-center transition-colors focus-visible:-outline-offset-2"
      :class="[
        sizeClass[size],
        option.value === modelValue
          ? selectedClass[size]
          : 'text-foreground/70 hover:text-foreground',
      ]"
    >
      {{ option.label }}
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
