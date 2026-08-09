<script setup lang="ts">
import { ToggleGroupItem, ToggleGroupRoot } from "reka-ui";

withDefaults(
  defineProps<{
    modelValue: string;
    options: { value: string; label: string }[];
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
 * A single-select toggle group clears itself when the pressed item is clicked
 * again, emitting `undefined`. This control has no unselected state, so that
 * payload is dropped and the current value stands.
 */
function select(value: unknown) {
  if (typeof value === "string") emit("update:modelValue", value);
}
</script>

<template>
  <ToggleGroupRoot
    type="single"
    :model-value="modelValue"
    :aria-label="label"
    class="inline-flex divide-x divide-border overflow-hidden rounded-md border border-border"
    @update:model-value="select"
  >
    <ToggleGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      class="text-center transition-colors focus-visible:-outline-offset-2"
      :class="[
        sizeClass[size],
        option.value === modelValue
          ? selectedClass[size]
          : 'text-foreground/70 hover:text-foreground',
      ]"
    >
      {{ option.label }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>
