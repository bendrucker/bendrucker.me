<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from "reka-ui";
import { PART_ICONS, type PartIcon } from "./icons";

export interface SegmentOption {
  value: string;
  label: string;
  icon?: PartIcon;
}

withDefaults(
  defineProps<{
    modelValue: string;
    options: readonly SegmentOption[];
    /** What the group chooses, for a screen reader. */
    label: string;
    /** Splits the width it is given evenly, for the owner and type filters on a phone. */
    fill?: boolean;
    size?: "sm" | "md";
    /** Shows only each option's icon, keeping the label for a screen reader. */
    iconOnly?: boolean;
    /** Sets the labels in mono, for units. */
    mono?: boolean;
    /** Stacks the options as a list, for the view switch in the desktop sidebar. */
    list?: boolean;
  }>(),
  { fill: false, size: "md", iconOnly: false, mono: false, list: false },
);

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

function select(value: unknown) {
  if (typeof value === "string") emit("update:modelValue", value);
}
</script>

<template>
  <RadioGroupRoot
    :model-value="modelValue"
    :aria-label="label"
    :orientation="list ? 'vertical' : 'horizontal'"
    :class="
      list
        ? 'flex flex-col gap-1'
        : [
            'gap-0.5 rounded-[10px] bg-foreground/6 p-[3px]',
            fill ? 'flex w-full' : 'inline-flex',
          ]
    "
    @update:model-value="select"
  >
    <RadioGroupItem
      v-for="option in options"
      :key="option.value"
      :value="option.value"
      :aria-label="iconOnly ? option.label : undefined"
      :title="iconOnly ? option.label : undefined"
      class="inline-flex items-center gap-1.5 rounded-[7px] text-dim transition-[color,background-color,box-shadow] duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cat data-[state=checked]:bg-background data-[state=checked]:text-cat data-[state=checked]:shadow-[0_1px_2px_var(--shadow)]"
      :class="[
        list
          ? 'min-h-9 justify-start px-2.5 text-sm'
          : size === 'sm'
            ? 'min-h-[30px] justify-center px-2.5 text-xs'
            : 'min-h-9 justify-center px-3 text-[13px]',
        fill ? 'min-w-0 flex-1 basis-0' : '',
        mono ? 'font-mono' : '',
      ]"
    >
      <span
        v-if="option.icon"
        aria-hidden="true"
        class="size-3.5 flex-none"
        :class="PART_ICONS[option.icon]"
      />
      <span v-if="!iconOnly" class="truncate">{{ option.label }}</span>
    </RadioGroupItem>
  </RadioGroupRoot>
</template>
