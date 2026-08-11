<script setup lang="ts">
import { epicRide } from "./fixtures";
import * as format from "./format";
import StatValue from "./StatValue.vue";

const distance = format.formatDistance(epicRide.distanceMi, "imperial");
const elevation = format.formatElevation(epicRide.elevationFt, "imperial");
const clock = format.formatClock(epicRide.movingSeconds);

function initState() {
  return { value: "112,400", unit: "ft", size: "md", label: "", width: 380 };
}
</script>

<template>
  <Story
    title="Stat value"
    group="primitives"
    auto-props-disabled
    :layout="{ type: 'grid', width: 380 }"
  >
    <Variant title="Stat value" :init-state="initState">
      <template #default="{ state }">
        <div :style="{ width: `${state.width}px`, maxWidth: '100%' }">
          <StatValue
            :value="state.value"
            :unit="state.unit || undefined"
            :size="state.size"
            :label="state.label || undefined"
          />
        </div>
      </template>

      <template #controls="{ state }">
        <HstText v-model="state.value" title="value" />
        <HstText v-model="state.unit" title="unit" />
        <HstSelect
          v-model="state.size"
          title="size"
          :options="['sm', 'md', 'lg']"
        />
        <HstText v-model="state.label" title="label (screen reader only)" />
        <HstSlider v-model="state.width" title="width" :min="64" :max="380" />
      </template>
    </Variant>

    <Variant title="Sizes">
      <div class="flex items-end gap-6">
        <StatValue :value="distance" unit="mi" size="lg" />
        <StatValue :value="distance" unit="mi" size="md" />
        <StatValue :value="distance" unit="mi" size="sm" />
      </div>
    </Variant>

    <Variant title="In a ride card">
      <div class="flex gap-6">
        <StatValue :value="distance" unit="mi" label="distance" />
        <StatValue :value="elevation" unit="ft" label="climbing" />
        <StatValue :value="clock" label="moving time" />
        <StatValue :value="String(epicRide.averageWatts)" unit="W" />
      </div>
      <p class="pt-2 text-[11px] text-foreground/70">
        the design leaves stats unlabelled and lets the unit carry the meaning,
        so each of these passes a label only a screen reader reads
      </p>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Stat value

A number and its unit, set at the three sizes the cards use.

Type a long value or clear the unit to see how the pair holds together, and
narrow the width to the column a ride card gives it. Sizes compares all three at
once, which no single control can.
</docs>
