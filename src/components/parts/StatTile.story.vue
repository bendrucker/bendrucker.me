<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { categoryControl, storyCategory } from "./fixtures";
import StatTile from "./StatTile.vue";
import type { PartIcon } from "./icons";

interface Stat {
  value: string;
  label: string;
  unit?: string;
  icon?: PartIcon;
}

const sets: Record<string, Stat[]> = {
  repo: [
    { value: "8,594", label: "stars", icon: "star" },
    { value: "Aug 2026", label: "since" },
    { value: "212", label: "pull requests", icon: "git-pull-request" },
    { value: "Go", label: "language" },
  ],
  ride: [
    { value: "139", unit: "mi", label: "distance" },
    { value: "18,100", unit: "ft", label: "climbing" },
    { value: "9:42", label: "moving time" },
    { value: "14.3", unit: "mph", label: "average speed" },
  ],
  long: [
    { value: "1,204,993", label: "a label long enough to truncate" },
    { value: "3", label: "records" },
  ],
};

const controls: StoryControlSet = {
  set: {
    type: "select",
    title: "stats",
    options: { repo: "repository", ride: "ride", long: "long values" },
  },
  category: categoryControl,
  width: { type: "slider", title: "width", min: 200, max: 680, step: 10 },
};

function initState() {
  return { set: "repo", category: "code", width: 340 };
}
</script>

<template>
  <Story
    title="Stat tile"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Stat tiles" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-1.5"
          :class="storyCategory(state.category).scope"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <StatTile
            v-for="stat in sets[state.set]"
            :key="stat.label"
            v-bind="stat"
          />
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Stat tile

The same tile on a ride and a repository: a value, an optional unit, and a
label that truncates. Two across on a phone, up to four on desktop, which the
grid decides from the width it is given.

Hover a tile carrying the star and the star turns once.
</docs>
