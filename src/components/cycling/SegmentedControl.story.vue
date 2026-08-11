<script setup lang="ts">
import { logEvent } from "histoire/client";
import { activity } from "./fixtures";
import SegmentedControl from "./SegmentedControl.vue";
import type { SegmentedOption } from "./types";

const optionSets: Record<string, SegmentedOption[]> = {
  modes: [
    { value: "log", label: "log" },
    { value: "highlights", label: "highlights" },
    { value: "prs", label: "prs", name: "personal records" },
  ],
  units: [
    { value: "imperial", label: "mi", name: "miles" },
    { value: "metric", label: "km", name: "kilometers" },
  ],
  years: activity.records.map(({ period }) => ({
    value: period,
    label: period,
  })),
  long: [
    { value: "everything", label: "everything since may 2024" },
    { value: "commutes", label: "commutes only" },
  ],
  single: [{ value: "all", label: "all" }],
  empty: [],
};

/**
 * Switching option sets strands whatever was selected in the last one, so the
 * control is handed the first option of the new set until the reviewer picks
 * again.
 */
function selected(state: { set: string; value: string }): string {
  const options = optionSets[state.set]!;
  return options.some((option) => option.value === state.value)
    ? state.value
    : (options[0]?.value ?? "");
}

function initState() {
  return { set: "modes", value: "log", size: "md", width: 380 };
}
</script>

<template>
  <Story
    title="Segmented control"
    group="primitives"
    auto-props-disabled
    :layout="{ type: 'grid', width: 380 }"
    :init-state="initState"
  >
    <Variant title="Segmented control">
      <template #default="{ state }">
        <div :style="{ width: `${state.width}px`, maxWidth: '100%' }">
          <SegmentedControl
            :model-value="selected(state)"
            :options="optionSets[state.set]!"
            :size="state.size"
            label="View mode"
            @update:model-value="
              state.value = $event;
              logEvent('update:modelValue', { value: $event });
            "
          />
        </div>
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.set"
          title="options"
          :options="{
            modes: 'mode tabs',
            units: 'units',
            years: 'record years',
            long: 'long labels',
            single: 'one option',
            empty: 'no options',
          }"
        />
        <HstSelect v-model="state.size" title="size" :options="['sm', 'md']" />
        <HstSlider v-model="state.width" title="width" :min="120" :max="380" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Segmented control

The pill row behind the mode tabs, the units toggle, and the record years.

`md` is the mode tabs, `sm` is everything else. Narrow the width with the long
labels selected: the row has to stay tappable rather than shrink its targets.
</docs>
