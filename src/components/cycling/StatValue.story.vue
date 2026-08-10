<script setup lang="ts">
import { bareRide, epicRide, raceRide } from "./fixtures";
import StatValue from "./StatValue.vue";
import { useUnits } from "./useUnits";

const {
  distanceUnit,
  elevationUnit,
  formatClock,
  formatDistance,
  formatDuration,
  formatElevation,
} = useUnits();
</script>

<template>
  <Story title="Cycling/Stat value" :layout="{ type: 'grid', width: 380 }">
    <Variant title="Sizes">
      <div class="flex items-end gap-6">
        <StatValue
          :value="formatDistance(epicRide.distanceMi)"
          :unit="distanceUnit"
          size="lg"
        />
        <StatValue
          :value="formatDistance(epicRide.distanceMi)"
          :unit="distanceUnit"
          size="md"
        />
        <StatValue
          :value="formatDistance(epicRide.distanceMi)"
          :unit="distanceUnit"
          size="sm"
        />
      </div>
    </Variant>

    <Variant title="Default size">
      <StatValue
        :value="formatElevation(epicRide.elevationFt)"
        :unit="elevationUnit"
      />
    </Variant>

    <Variant title="Ride card pair">
      <div class="flex gap-6">
        <StatValue
          :value="formatDistance(epicRide.distanceMi)"
          :unit="distanceUnit"
        />
        <StatValue
          :value="formatElevation(epicRide.elevationFt)"
          :unit="elevationUnit"
        />
      </div>
    </Variant>

    <Variant title="No unit">
      <div class="flex items-end gap-6">
        <StatValue value="2026" size="lg" />
        <StatValue :value="formatDuration(epicRide.movingSeconds)" />
        <StatValue :value="formatClock(raceRide.movingSeconds)" size="sm" />
      </div>
    </Variant>

    <Variant title="Labelled for assistive tech">
      <div class="flex gap-6">
        <StatValue
          :value="formatDistance(epicRide.distanceMi)"
          :unit="distanceUnit"
          label="distance"
        />
        <StatValue
          :value="formatClock(epicRide.movingSeconds)"
          label="moving time"
        />
      </div>
      <p class="pt-2 text-xs text-foreground/70">
        the label is screen-reader only, so these look identical to the
        unlabelled variants above
      </p>
    </Variant>

    <Variant title="Power">
      <div class="flex gap-6">
        <StatValue :value="String(epicRide.averageWatts)" unit="W" size="lg" />
        <span aria-hidden="true"><StatValue value="—" size="lg" /></span>
        <span class="sr-only">no data</span>
      </div>
    </Variant>

    <Variant title="Small values">
      <div class="flex gap-6">
        <StatValue
          :value="formatDistance(bareRide.distanceMi)"
          :unit="distanceUnit"
        />
        <StatValue
          :value="formatElevation(bareRide.elevationFt)"
          :unit="elevationUnit"
        />
      </div>
    </Variant>

    <Variant title="Long value in a narrow column">
      <div class="w-24">
        <StatValue value="112,400" :unit="elevationUnit" size="lg" />
      </div>
    </Variant>

    <Variant title="Beside a label">
      <div class="flex items-baseline gap-2">
        <StatValue
          :value="formatDistance(epicRide.distanceMi)"
          :unit="distanceUnit"
          size="sm"
        />
        <span class="text-[11px] text-foreground/70">{{ epicRide.name }}</span>
      </div>
    </Variant>
  </Story>
</template>
