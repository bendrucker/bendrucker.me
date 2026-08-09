<script setup lang="ts">
import { highlightMonths } from "./fixtures";
import HighlightsView from "./HighlightsView.vue";
import type { HighlightMonth } from "./types";
import UnitsProvider from "./UnitsProvider.vue";

const quietMonth: HighlightMonth = {
  ...highlightMonths[0]!,
  highlights: [],
};
</script>

<template>
  <Story title="Cycling/Highlights view" :layout="{ type: 'grid', width: 860 }">
    <Variant title="Two months">
      <div class="bg-background p-4 text-foreground">
        <HighlightsView :months="highlightMonths" />
      </div>
    </Variant>

    <Variant title="Metric units">
      <div class="bg-background p-4 text-foreground">
        <UnitsProvider units="metric">
          <HighlightsView :months="highlightMonths.slice(0, 1)" />
        </UnitsProvider>
      </div>
    </Variant>

    <Variant title="Month with nothing to show">
      <div class="bg-background p-4 text-foreground">
        <HighlightsView :months="[quietMonth]" />
      </div>
    </Variant>

    <Variant title="No months">
      <div class="bg-background p-4 text-foreground">
        <HighlightsView :months="[]" />
      </div>
    </Variant>
  </Story>
</template>
