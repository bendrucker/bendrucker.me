<script setup lang="ts">
import ElevationProfile from "./ElevationProfile.vue";
import { bareRide, epicRide, raceRide } from "./fixtures";
</script>

<template>
  <Story
    title="Cycling/Elevation profile"
    :layout="{ type: 'grid', width: 380 }"
  >
    <Variant title="Hilly ride">
      <ElevationProfile :samples="epicRide.elevationProfile ?? []" />
    </Variant>

    <Variant title="Flat ride">
      <ElevationProfile :samples="raceRide.elevationProfile ?? []" />
    </Variant>

    <Variant title="Short ride">
      <ElevationProfile :samples="bareRide.elevationProfile ?? []" />
    </Variant>

    <Variant title="One sample">
      <ElevationProfile :samples="[0.7]" />
    </Variant>

    <Variant title="Two samples">
      <ElevationProfile :samples="[0.2, 0.85]" />
    </Variant>

    <Variant title="Empty">
      <ElevationProfile :samples="[]" />
    </Variant>

    <Variant title="Behind card text">
      <div class="relative overflow-hidden rounded-lg border border-border p-3">
        <ElevationProfile
          class="pointer-events-none absolute inset-x-0 bottom-0 h-12"
          :samples="epicRide.elevationProfile ?? []"
        />
        <p class="relative text-[13px] font-bold">{{ epicRide.name }}</p>
        <p class="relative text-[11px] text-foreground/70">
          the ride card stacks its text over the wash
        </p>
      </div>
    </Variant>
  </Story>
</template>
