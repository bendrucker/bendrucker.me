<script setup lang="ts">
import { crowdedRide, epicRide, raceRide, travelRide } from "./fixtures";
import RideBadge from "./RideBadge.vue";
import type { RideBadge as RideBadgeType } from "./types";

const everyKind: RideBadgeType[] = [
  ...epicRide.badges,
  ...travelRide.badges,
  ...raceRide.badges,
];

const longLabel: RideBadgeType = {
  kind: "new-climb",
  label: "✦ new climb · bolinas-fairfax over the ridge to alpine dam",
};
</script>

<template>
  <Story title="Cycling/Ride badge" :layout="{ type: 'grid', width: 380 }">
    <Variant title="Every kind">
      <ul class="flex flex-wrap gap-1.5">
        <li v-for="badge in everyKind" :key="badge.kind">
          <RideBadge :badge="badge" />
        </li>
      </ul>
    </Variant>

    <Variant title="Single badge">
      <RideBadge :badge="raceRide.badges[0]!" />
    </Variant>

    <Variant title="Three on a ride">
      <ul class="flex flex-wrap gap-1.5">
        <li v-for="badge in crowdedRide.badges" :key="badge.kind">
          <RideBadge :badge="badge" />
        </li>
      </ul>
    </Variant>

    <Variant title="Long label, narrow container">
      <div class="w-44">
        <RideBadge :badge="longLabel" />
      </div>
    </Variant>

    <Variant title="Inline beside a ride name">
      <p class="flex flex-wrap items-center gap-1.5 text-[15px] font-bold">
        {{ epicRide.name }}
        <RideBadge
          v-for="badge in epicRide.badges"
          :key="badge.kind"
          :badge="badge"
        />
      </p>
    </Variant>
  </Story>
</template>
