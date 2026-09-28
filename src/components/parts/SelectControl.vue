<script setup lang="ts">
import { computed } from "vue";
import { PART_ICONS, type PartIcon } from "./icons";

export interface SelectOption {
  value: string;
  label: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: readonly SelectOption[];
    /** What the select chooses, for a screen reader. */
    label: string;
    /** The face shown while nothing is chosen, as in "Language". */
    placeholder?: string;
    icon?: PartIcon;
    /** A color swatch ahead of the value, as in a language's diamond. */
    dot?: string;
    /** Shows only the icon, for sort on a phone. */
    iconOnly?: boolean;
    /** Tints the face while a value is set. Sort is always set, so it opts out. */
    tint?: boolean;
    /** The query parameter the select submits as, inside a form. */
    name?: string;
  }>(),
  { placeholder: "", iconOnly: false, tint: true },
);

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const chosen = computed(() =>
  props.options.find((option) => option.value === props.modelValue),
);

const on = computed(() => props.tint && props.modelValue !== "");

function change(event: Event) {
  if (event.target instanceof HTMLSelectElement) {
    emit("update:modelValue", event.target.value);
  }
}
</script>

<template>
  <span
    class="group/pick relative inline-flex min-h-9 items-center gap-1.5 rounded-[10px] text-[13px] transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-1 has-focus-visible:outline-cat"
    :class="[
      on
        ? 'border border-transparent tint-16 text-foreground'
        : 'border border-line bg-background text-foreground hover:border-cat/40',
      iconOnly ? 'w-9 justify-center' : 'px-2.5',
    ]"
    :title="iconOnly ? label : undefined"
  >
    <span
      v-if="dot"
      aria-hidden="true"
      class="size-2 flex-none rotate-45 rounded-[1.5px]"
      :style="{ background: dot }"
    />
    <span
      v-else-if="icon"
      aria-hidden="true"
      class="size-3.5 flex-none"
      :class="[PART_ICONS[icon], on ? 'text-cat' : 'text-dim']"
    />
    <template v-if="!iconOnly">
      <span class="truncate">{{ chosen?.label ?? placeholder }}</span>
      <span
        aria-hidden="true"
        class="icon-[lucide--chevron-down] size-3 flex-none text-dim"
      />
    </template>
    <!-- The native select sits over the face at 16px so a tap opens the
         platform picker and iOS keeps from zooming the page to read it. -->
    <select
      :value="modelValue"
      :name="name"
      :aria-label="label"
      class="absolute inset-0 cursor-pointer appearance-none text-base opacity-0"
      @change="change"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <!-- `selected` carries the value into server-rendered markup, which
           drops a select's own `value` binding. -->
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :selected="option.value === modelValue"
      >
        {{ option.label }}
      </option>
    </select>
  </span>
</template>
