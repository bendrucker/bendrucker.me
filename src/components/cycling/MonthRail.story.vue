<script setup lang="ts">
import { months } from "./fixtures";
import { formatMonthKey } from "./format";
import MonthRail from "./MonthRail.vue";
import MonthRailScrollDemo from "./MonthRailScrollDemo.vue";

const railMonths = months.map(({ key, label }) => ({ key, label }));

const multiYearMonths = [
  "2026-07",
  "2026-06",
  "2026-05",
  "2026-04",
  "2026-03",
  "2025-12",
  "2025-11",
  "2025-10",
  "2025-09",
  "2025-08",
  "2024-11",
  "2024-10",
].map((key) => ({ key, label: formatMonthKey(key) }));
</script>

<template>
  <!-- Single layout renders each variant in its own full-height frame. A grid
       cell cannot hold the rail: it is fixed, so it would pin itself to the
       Histoire window and float over the UI. The frame also gives the scroll
       spy a real scrolling viewport to observe against. -->
  <Story title="Cycling/Month rail" :layout="{ type: 'single', iframe: true }">
    <Variant title="Scroll spy">
      <MonthRailScrollDemo :months="railMonths" />
    </Variant>

    <Variant title="Several years">
      <MonthRailScrollDemo :months="multiYearMonths" />
    </Variant>

    <Variant title="Single month">
      <div
        class="bg-background px-4 py-6 text-[11px] text-foreground/55 sm:pr-16"
      >
        one month, no year to group against.
        <MonthRail
          :months="railMonths.slice(0, 1)"
          :active-key="railMonths[0]!.key"
        />
      </div>
    </Variant>

    <Variant title="Nothing active">
      <div
        class="bg-background px-4 py-6 text-[11px] text-foreground/55 sm:pr-16"
      >
        every month muted, which is what the rail shows before the first section
        reaches the viewport.
        <MonthRail :months="multiYearMonths" :active-key="null" />
      </div>
    </Variant>

    <Variant title="Empty">
      <div
        class="bg-background px-4 py-6 text-[11px] text-foreground/55 sm:pr-16"
      >
        no months, so the rail renders nothing at all.
        <MonthRail :months="[]" />
      </div>
    </Variant>
  </Story>
</template>
