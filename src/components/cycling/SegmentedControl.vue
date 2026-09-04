<script setup lang="ts">
import { computed } from "vue";
import { RadioGroupItem, RadioGroupRoot } from "reka-ui";
import type { SegmentedOption } from "./types";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: SegmentedOption[];
    label: string;
    size?: "sm" | "md";
    /** Fills the width it is given, splitting it evenly between the segments. */
    block?: boolean;
    /** `ghost` drops the frame, for a control sitting inside another panel. */
    variant?: "outline" | "ghost";
  }>(),
  { size: "md", block: false, variant: "outline" },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

// A block row is wide enough to be the thing a thumb reaches for, so it stands
// taller than the same size does inline. The padding is written out per mode
// because Tailwind resolves a `py-0.5` against a `py-1.5` by stylesheet order,
// not by the order the classes reach the binding.
const sizeClass = {
  sm: {
    inline: "px-2 py-0.5 text-[10px]",
    block: "px-2 py-1.5 text-[10px]",
  },
  md: {
    inline: "px-3 py-1 text-[11px]",
    block: "px-3 py-1.5 text-[11px]",
  },
};

// An outlined control is a panel of its own: a frame around the set and a fill
// under the chosen segment. A ghost one is a word beside other words, so the
// frame goes and only the chosen segment carries a fill. Nothing about that
// treatment changes with the size.
const rootClass = computed(() =>
  props.variant === "ghost"
    ? "gap-0.5"
    : "divide-x divide-border overflow-hidden rounded-md border border-border",
);

const selectedClass = computed(() =>
  props.variant === "ghost"
    ? "rounded bg-muted font-bold text-foreground"
    : {
        sm: "bg-muted text-foreground",
        md: "bg-foreground text-background font-bold",
      }[props.size],
);

const unselectedClass = computed(() =>
  props.variant === "ghost"
    ? "rounded text-foreground/50 hover:text-foreground"
    : "text-foreground/70 hover:text-foreground",
);

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
    :class="[rootClass, block ? 'flex w-full' : 'inline-flex']"
    @update:model-value="select"
  >
    <RadioGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :aria-label="option.name"
      class="text-center transition-colors focus-visible:-outline-offset-2"
      :class="[
        sizeClass[size][block ? 'block' : 'inline'],
        block ? 'min-w-0 flex-1 basis-0 break-words' : '',
        option.value === modelValue ? selectedClass : unselectedClass,
      ]"
    >
      {{ option.label }}
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
