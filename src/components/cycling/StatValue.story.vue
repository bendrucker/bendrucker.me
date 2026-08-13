<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { epicRide } from "./fixtures";
import * as format from "./format";
import StatValue from "./StatValue.vue";

const distance = format.formatDistance(epicRide.distanceMi, "imperial");
const elevation = format.formatElevation(epicRide.elevationFt, "imperial");
const clock = format.formatClock(epicRide.movingSeconds);

const controls: StoryControlSet = {
  value: { type: "text", title: "value" },
  unit: { type: "text", title: "unit" },
  size: { type: "select", title: "size", options: ["sm", "md", "lg"] },
  label: { type: "text", title: "label (screen reader only)" },
  width: { type: "slider", title: "width", min: 64, max: 340 },
};

function initState() {
  return { value: "112,400", unit: "ft", size: "md", label: "", width: 340 };
}
</script>

<template>
  <Story
    title="Stat value"
    group="primitives"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Stat value" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
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
        <PanelControls :controls="controls" :state="state" />
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
