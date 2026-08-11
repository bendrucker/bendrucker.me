<script setup lang="ts">
import { epicRide } from "./fixtures";
import StravaLink from "./StravaLink.vue";

function initState() {
  return { surface: "page" };
}
</script>

<template>
  <Story
    title="Strava link"
    group="ride"
    auto-props-disabled
    :layout="{ type: 'grid', width: 380 }"
  >
    <Variant title="Strava link" :init-state="initState">
      <template #default="{ state }">
        <div
          class="p-3"
          :class="state.surface === 'muted' ? 'rounded-md bg-muted' : ''"
        >
          <StravaLink :href="epicRide.stravaUrl" />
        </div>
      </template>

      <template #controls="{ state }">
        <HstSelect
          v-model="state.surface"
          title="surface"
          :options="{ page: 'the page', muted: 'a muted panel' }"
        />
      </template>
    </Variant>

    <Variant title="In a ride card header">
      <div class="flex items-center gap-2 text-[11px] text-foreground/70">
        <span class="text-[15px] font-bold text-foreground">{{
          epicRide.name
        }}</span>
        <span class="ml-auto">tue 7/11</span>
        <StravaLink :href="epicRide.stravaUrl" :name="epicRide.name" />
      </div>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Strava link

The mark that sends a ride back to Strava.

The header variant passes `name`, which is what gives each link on a page of
rides an accessible name of its own rather than a page full of "Strava".
</docs>
