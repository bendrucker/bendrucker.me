<script setup lang="ts">
import { bareRide, crowdedRide, epicRide, raceRide } from "./fixtures";
import FactChip from "./FactChip.vue";
import type { RideFact } from "./types";

const longFact: RideFact = {
  id: "long",
  icon: "▲",
  label: "3,204 ft climb · 8.4% average grade over 7.1 miles · 41 min",
};
</script>

<template>
  <Story title="Cycling/Fact chip" :layout="{ type: 'grid', width: 380 }">
    <Variant title="Single fact">
      <FactChip :fact="raceRide.facts[0]!" />
    </Variant>

    <Variant title="Two facts">
      <ul class="flex flex-wrap gap-1.5">
        <li v-for="fact in epicRide.facts" :key="fact.id">
          <FactChip :fact="fact" />
        </li>
      </ul>
    </Variant>

    <Variant title="Three facts">
      <ul class="flex flex-wrap gap-1.5">
        <li v-for="fact in crowdedRide.facts" :key="fact.id">
          <FactChip :fact="fact" />
        </li>
      </ul>
    </Variant>

    <Variant title="Long fact, narrow container">
      <div class="w-48">
        <FactChip :fact="longFact" />
      </div>
    </Variant>

    <Variant title="No facts">
      <ul class="flex flex-wrap gap-1.5">
        <li v-for="fact in bareRide.facts" :key="fact.id">
          <FactChip :fact="fact" />
        </li>
      </ul>
      <p class="text-xs text-foreground/70">
        bareRide has no facts, so the list renders nothing.
      </p>
    </Variant>
  </Story>
</template>
