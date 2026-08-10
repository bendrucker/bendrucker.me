<script setup lang="ts">
import { ref } from "vue";
import { activity } from "./fixtures";
import SegmentedControl from "./SegmentedControl.vue";

const mode = ref("log");
const defaultSizeMode = ref("log");
const modes = [
  { value: "log", label: "log" },
  { value: "highlights", label: "highlights" },
  { value: "prs", label: "prs" },
];

const units = ref("imperial");
const unitOptions = [
  { value: "imperial", label: "mi" },
  { value: "metric", label: "km" },
];

const yearOptions = activity.records.map(({ period }) => ({
  value: period,
  label: period,
}));
const year = ref(yearOptions[0]!.value);

const surface = ref("everything");
const longOptions = [
  { value: "everything", label: "everything since may 2024" },
  { value: "commutes", label: "commutes only" },
];
</script>

<template>
  <Story
    title="Cycling/Segmented control"
    :layout="{ type: 'grid', width: 380 }"
  >
    <Variant title="Mode tabs (md)">
      <SegmentedControl
        v-model="mode"
        :options="modes"
        label="View mode"
        size="md"
      />
      <p class="pt-2 text-xs text-foreground/70">selected: {{ mode }}</p>
    </Variant>

    <Variant title="Units (sm)">
      <SegmentedControl
        v-model="units"
        :options="unitOptions"
        label="Distance units"
        size="sm"
      />
      <p class="pt-2 text-xs text-foreground/70">selected: {{ units }}</p>
    </Variant>

    <Variant title="Year pills (sm)">
      <SegmentedControl
        v-model="year"
        :options="yearOptions"
        label="Personal record year"
        size="sm"
      />
    </Variant>

    <Variant title="Default size">
      <SegmentedControl
        v-model="defaultSizeMode"
        :options="modes"
        label="View mode"
      />
    </Variant>

    <Variant title="Long labels">
      <SegmentedControl
        v-model="surface"
        :options="longOptions"
        label="Ride set"
      />
    </Variant>

    <Variant title="Long labels, narrow container">
      <div class="w-40">
        <SegmentedControl
          v-model="surface"
          :options="longOptions"
          label="Ride set"
        />
      </div>
    </Variant>

    <Variant title="No options">
      <SegmentedControl v-model="mode" :options="[]" label="View mode" />
      <p class="pt-2 text-xs text-foreground/70">
        an empty control, sized by its own border
      </p>
    </Variant>

    <Variant title="Single option">
      <SegmentedControl
        v-model="year"
        :options="[yearOptions[0]!]"
        label="Personal record year"
        size="sm"
      />
    </Variant>
  </Story>
</template>
