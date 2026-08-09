<script setup lang="ts">
import { epicRide, rides } from "./fixtures";
import StravaLink from "./StravaLink.vue";
</script>

<template>
  <Story title="Cycling/Strava link" :layout="{ type: 'grid', width: 380 }">
    <Variant title="Default">
      <StravaLink :href="epicRide.stravaUrl" />
    </Variant>

    <Variant title="In a ride card header">
      <div class="flex items-center gap-2 text-[11px] text-foreground/55">
        <span class="text-[15px] font-bold text-foreground">{{
          epicRide.name
        }}</span>
        <span class="ml-auto">tue 7/11</span>
        <StravaLink :href="epicRide.stravaUrl" />
      </div>
    </Variant>

    <Variant title="One per ride">
      <ul class="flex flex-col gap-2">
        <li
          v-for="ride in rides"
          :key="ride.id"
          class="flex items-center gap-2 text-[11px]"
        >
          <span class="truncate">{{ ride.name }}</span>
          <StravaLink :href="ride.stravaUrl" class="ml-auto shrink-0" />
        </li>
      </ul>
    </Variant>

    <Variant title="On a muted surface">
      <div class="rounded-md bg-muted p-3">
        <StravaLink :href="epicRide.stravaUrl" />
      </div>
    </Variant>
  </Story>
</template>
