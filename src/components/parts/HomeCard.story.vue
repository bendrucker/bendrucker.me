<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { CATEGORIES, type CategoryId } from "@/categories";
import { storyCategory } from "./fixtures";
import { epicRide } from "@/components/cycling/fixtures";
import CodeFeature from "./CodeFeature.vue";
import HomeCard from "./HomeCard.vue";
import ItemRow from "./ItemRow.vue";
import RideFeature from "./RideFeature.vue";

const [firstPhoto] = epicRide.media;
const featuredPhoto = firstPhoto && {
  url: firstPhoto.thumbnailUrl,
  alt: firstPhoto.alt,
};

const controls: StoryControlSet = {
  count: { type: "slider", title: "cards", min: 1, max: 6 },
  rows: { type: "slider", title: "rows", min: 1, max: 5 },
  width: { type: "slider", title: "width", min: 300, max: 1060, step: 10 },
};

function initState() {
  return { count: 3, rows: 5, width: 1060 };
}

const ROWS: Record<string, { title: string; text?: string; org?: string }[]> = {
  rides: [
    { title: "Friends of Tam", text: "139 mi" },
    { title: "Mount Diablo", text: "62 mi" },
    { title: "Paradise Loop", text: "31 mi" },
    { title: "Old La Honda", text: "48 mi" },
    { title: "Hawk Hill", text: "22 mi" },
  ],
  code: [
    { title: "extensions", org: "raycast" },
    { title: "bendrucker.me", org: "bendrucker" },
    { title: "tflint", org: "terraform-linters" },
    { title: "claude", org: "bendrucker" },
    { title: "dotfiles", org: "bendrucker" },
  ],
  reading: [
    { title: "The Overstory", text: "Richard Powers" },
    { title: "Piranesi", text: "Susanna Clarke" },
    { title: "The Dispossessed", text: "Ursula K. Le Guin" },
    { title: "Stoner", text: "John Williams" },
    { title: "Pachinko", text: "Min Jin Lee" },
  ],
  writing: [
    { title: "Friends of Tam", text: "Sep 15" },
    { title: "Open source, five years on", text: "Aug 2" },
    { title: "Route maps without raster tiles", text: "Jul 9" },
    { title: "A log that pages backwards", text: "Jun 21" },
    { title: "Theming with one attribute", text: "May 30" },
  ],
  watching: [
    { title: "Severance", text: "Season 2" },
    { title: "Slow Horses", text: "Season 4" },
    { title: "Silo", text: "Season 2" },
    { title: "Andor", text: "Season 2" },
    { title: "Shrinking", text: "Season 2" },
  ],
  listening: [
    { title: "In Rainbows", text: "Radiohead" },
    { title: "Blonde", text: "Frank Ocean" },
    { title: "Currents", text: "Tame Impala" },
    { title: "Hounds of Love", text: "Kate Bush" },
    { title: "Kid A", text: "Radiohead" },
  ],
};
</script>

<template>
  <Story
    title="Home card"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Home cards" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="grid gap-2 md:grid-cols-2 md:gap-4"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <HomeCard
            v-for="cat in CATEGORIES.slice(0, state.count)"
            :id="cat.id"
            :key="cat.id"
          >
            <ul class="flex flex-col gap-0.5 md:gap-1">
              <li
                v-for="row in ROWS[cat.id]?.slice(0, state.rows)"
                :key="row.title"
              >
                <ItemRow
                  href="#"
                  :title="row.title"
                  :text="row.text"
                  :org="row.org"
                  :lead="cat.id === 'code' ? 'dot' : 'none'"
                  dot="#3178c6"
                  :via="storyCategory(cat.id).art ? 'Trakt' : undefined"
                  compact
                />
              </li>
            </ul>
          </HomeCard>
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>

    <Variant title="Featured pair">
      <div class="grid gap-2 md:grid-cols-2 md:gap-4">
        <HomeCard id="rides">
          <RideFeature
            href="#"
            :id="epicRide.id"
            :name="epicRide.name"
            :figures="['139 mi', '18,100 ft']"
            hilly
            :route="epicRide.route"
            :photo="featuredPhoto"
          />
          <ul class="flex flex-col gap-0.5 md:gap-1">
            <li v-for="row in ROWS.rides?.slice(1, 4)" :key="row.title">
              <ItemRow href="#" :title="row.title" :figure="row.text" compact />
            </li>
          </ul>
        </HomeCard>
        <HomeCard id="code">
          <CodeFeature
            href="#"
            title="extensions"
            org="raycast"
            text="Everything you need to extend Raycast."
            lead="dot"
            dot="#3178c6"
            latest="Refresh the menu bar in the background"
          />
          <ul class="flex flex-col gap-0.5 md:gap-1">
            <li v-for="row in ROWS.code?.slice(1, 4)" :key="row.title">
              <ItemRow
                href="#"
                :title="row.title"
                :org="row.org"
                lead="dot"
                dot="#3178c6"
                compact
              />
            </li>
          </ul>
        </HomeCard>
      </div>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Home card

One category on the home page. A watermark of its icon sits in the heading
band at 8%, 60px on a phone and 76px on desktop. The heading opens the route.

A card shows the rows home carries whole: five for most categories, and a
feature with three rows under it for Rides and Code. The grid is two columns
from the desktop breakpoint up, a row's cards stretch to the taller one, and an
odd card out spans both. Set three cards at full width to see the span.
</docs>
