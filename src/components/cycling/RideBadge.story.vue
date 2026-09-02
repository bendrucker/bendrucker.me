<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { crowdedRide, epicRide, raceRide, travelRide } from "./fixtures";
import RideBadge from "./RideBadge.vue";
import type { RideBadge as RideBadgeType } from "@/activity/types";

const everyKind: RideBadgeType[] = [
  ...epicRide.badges,
  ...travelRide.badges,
  ...raceRide.badges,
];

const badges: Record<string, RideBadgeType> = {
  ...Object.fromEntries(everyKind.map((badge) => [badge.kind, badge])),
  long: {
    kind: "new-climb",
    icon: "mountain",
    label: "bolinas-fairfax over the ridge to alpine dam",
  },
};

const badgeOptions = {
  ...Object.fromEntries(everyKind.map((badge) => [badge.kind, badge.label])),
  long: "a very long label",
};

const widthControl: StoryControlSet = {
  width: { type: "slider", title: "width", min: 120, max: 340 },
};

const badgeControls: StoryControlSet = {
  badge: { type: "select", title: "badge", options: badgeOptions },
  ...widthControl,
};

function initState() {
  return { width: 340, badge: "longest" };
}
</script>

<template>
  <Story
    title="Ride badge"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
    :init-state="initState"
  >
    <Variant title="Every kind">
      <template #default="{ state }">
        <PreviewControls :controls="widthControl" :state="state" />
        <ul
          class="flex flex-wrap gap-1.5"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <li v-for="badge in everyKind" :key="badge.kind">
            <RideBadge :badge="badge" />
          </li>
        </ul>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="widthControl" :state="state" />
      </template>
    </Variant>

    <Variant title="Beside a ride name">
      <template #default="{ state }">
        <PreviewControls :controls="badgeControls" :state="state" />
        <p
          class="flex flex-wrap items-center gap-1.5 text-[15px] font-bold"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          {{ crowdedRide.name }}
          <RideBadge :badge="badges[state.badge]!" />
        </p>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="badgeControls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Ride badge

The glyph-and-label chips that mark a ride as longest, new, or a race.

Every kind shows the full set in one row. Beside a ride name is where the
wrapping matters: narrow the width and check the badge stays with the name rather
than stranding a glyph.
</docs>
