<script setup lang="ts">
import { ref } from "vue";
import { juneMonth, months } from "./fixtures";
import LogView from "./LogView.vue";
import type { MonthGroup } from "./types";
import UnitsProvider from "./UnitsProvider.vue";

const opened = ref("none");

const emptyMonth: MonthGroup = {
  ...juneMonth,
  rides: [],
  commuteCount: 1,
};
</script>

<template>
  <Story title="Cycling/Log view" :layout="{ type: 'single', iframe: true }">
    <Variant title="Months of rides">
      <div class="min-h-screen bg-background p-4 pb-[60vh] text-foreground">
        <LogView
          :months="months"
          @open-photo="
            (ride, index) => (opened = `${ride.name} photo ${index + 1}`)
          "
        />
        <p class="mt-6 text-[11px] text-foreground/70">
          last opened photo: {{ opened }}
        </p>
      </div>
    </Variant>

    <Variant title="Metric units">
      <div class="min-h-screen bg-background p-4 pb-[60vh] text-foreground">
        <UnitsProvider units="metric">
          <LogView :months="months.slice(0, 2)" />
        </UnitsProvider>
      </div>
    </Variant>

    <Variant title="Month with no cards">
      <div class="min-h-screen bg-background p-4 text-foreground">
        <LogView :months="[emptyMonth]" />
      </div>
    </Variant>

    <Variant title="No months">
      <div class="min-h-screen bg-background p-4 text-foreground">
        <LogView :months="[]" />
      </div>
    </Variant>
  </Story>
</template>
