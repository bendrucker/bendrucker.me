<script setup lang="ts">
import { crowdedRide, rankedLists } from "./fixtures";
import RankedListPanel from "./RankedListPanel.vue";
import type { RankedList } from "./types";

function fixtureList(id: string): RankedList {
  return rankedLists.find((list) => list.id === id)!;
}

const distance = fixtureList("distance");
const efforts = fixtureList("efforts");

const shortList: RankedList = { ...efforts, rows: efforts.rows.slice(0, 1) };

const longNames: RankedList = {
  ...distance,
  rows: distance.rows.map((row, index) =>
    index === 0 ? { ...row, name: crowdedRide.name } : row,
  ),
};

const mixedLinks: RankedList = {
  ...distance,
  rows: distance.rows.map((row, index) =>
    index === 1 ? { ...row, href: undefined } : row,
  ),
};

const emptyList: RankedList = { ...distance, rows: [] };
</script>

<template>
  <Story
    title="Cycling/Ranked list panel"
    :layout="{ type: 'grid', width: 380 }"
  >
    <Variant title="Distance (linked rows)">
      <RankedListPanel :list="distance" />
    </Variant>

    <Variant title="Elevation">
      <RankedListPanel :list="fixtureList('elevation')" />
    </Variant>

    <Variant title="Duration (no links)">
      <RankedListPanel :list="fixtureList('duration')" />
    </Variant>

    <Variant title="Some rows linked">
      <RankedListPanel :list="mixedLinks" />
    </Variant>

    <Variant title="Clock">
      <RankedListPanel :list="efforts" />
    </Variant>

    <Variant title="Climbs">
      <RankedListPanel :list="fixtureList('climbs')" />
    </Variant>

    <Variant title="Single row">
      <RankedListPanel :list="shortList" />
    </Variant>

    <Variant title="Long names">
      <RankedListPanel :list="longNames" />
    </Variant>

    <Variant title="No rows">
      <RankedListPanel :list="emptyList" />
    </Variant>
  </Story>
</template>
