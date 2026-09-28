<script setup lang="ts">
import type { Units } from "@/components/cycling/types";
import SegmentGroup, { type SegmentOption } from "./SegmentGroup.vue";

withDefaults(
  defineProps<{
    modelValue: Units;
    /**
     * `segment` sits beside search on a phone. `mini` is the desktop sidebar's
     * line of text under the views.
     */
    form?: "segment" | "mini";
  }>(),
  { form: "mini" },
);

const emit = defineEmits<{ "update:modelValue": [value: Units] }>();

const UNITS = [
  { value: "imperial", label: "mi", name: "Miles" },
  { value: "metric", label: "km", name: "Kilometers" },
] as const satisfies readonly { value: Units; label: string; name: string }[];

const segmentOptions: SegmentOption[] = UNITS.map(({ value, label }) => ({
  value,
  label,
}));

function pick(value: string) {
  const unit = UNITS.find((option) => option.value === value);
  if (unit) emit("update:modelValue", unit.value);
}
</script>

<template>
  <SegmentGroup
    v-if="form === 'segment'"
    :model-value="modelValue"
    :options="segmentOptions"
    label="Units"
    size="sm"
    mono
    @update:model-value="pick"
  />
  <div
    v-else
    role="group"
    aria-label="Units"
    class="inline-flex items-center gap-1 font-mono text-xs text-dim"
  >
    <template v-for="(unit, i) in UNITS" :key="unit.value">
      <span v-if="i > 0" aria-hidden="true">/</span>
      <button
        type="button"
        :aria-pressed="modelValue === unit.value"
        :aria-label="unit.name"
        class="rounded-sm px-0.5 underline-offset-4 hover:text-foreground aria-pressed:text-foreground aria-pressed:underline aria-pressed:decoration-cat aria-pressed:decoration-2"
        @click="pick(unit.value)"
      >
        {{ unit.label }}
      </button>
    </template>
  </div>
</template>
