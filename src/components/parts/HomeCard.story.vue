<script setup lang="ts">
import { defineComponent, h, onMounted, onUpdated, ref } from "vue";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { CATEGORIES, type CategoryId } from "@/categories";
import { installDrawers } from "@/home/drawer";
import { storyCategory } from "./fixtures";
import HomeCard from "./HomeCard.vue";
import ItemRow from "./ItemRow.vue";

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

/** A card that opens, one that stays shut, and one short enough to fit. */
const SHOWCASE: readonly { id: CategoryId; rows: number }[] = [
  { id: "reading", rows: 5 },
  { id: "code", rows: 5 },
  { id: "writing", rows: 1 },
];

/**
 * Stands in for the home page's script: measures the cards once they mount and
 * again whenever the controls change them, and can open the first one.
 */
const Drawers = defineComponent({
  props: { openFirst: Boolean },
  setup(props, { slots }) {
    const root = ref<HTMLElement>();
    onMounted(() => {
      installDrawers();
      if (!props.openFirst) return;
      const toggle = root.value?.querySelector("[data-drawer-toggle]");
      if (toggle instanceof HTMLElement) toggle.click();
    });
    onUpdated(installDrawers);
    return () => h("div", { ref: root }, slots.default?.());
  },
});
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
        <Drawers>
          <div
            class="grid items-start gap-2 md:grid-cols-2 md:gap-4"
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
        </Drawers>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>

    <Variant title="Open, shut, and fitting">
      <Drawers open-first>
        <div class="grid items-start gap-2 md:grid-cols-2 md:gap-4">
          <HomeCard v-for="{ id, rows } in SHOWCASE" :id="id" :key="id">
            <ul class="flex flex-col gap-0.5 md:gap-1">
              <li v-for="row in ROWS[id]?.slice(0, rows)" :key="row.title">
                <ItemRow
                  href="#"
                  :title="row.title"
                  :text="row.text"
                  :org="row.org"
                  :lead="id === 'code' ? 'dot' : 'none'"
                  dot="#3178c6"
                  compact
                />
              </li>
            </ul>
          </HomeCard>
        </div>
      </Drawers>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Home card

One category on the home page. A watermark of its icon sits in the heading
band at 8%, 60px on a phone and 76px on desktop. The heading opens the route.

The body is a drawer resting at a peek height, 148px on a phone and 208px on
desktop, so every card stands the same height and the grid ends on a flat edge.
A body that overruns the peek fades at its foot and shows a handle: a grabber
on a phone, which a tap toggles and a drag pulls, and a chevron on desktop. A
body that fits shows neither.

The grid is two columns from the desktop breakpoint up, and an odd card out
spans both. An open card grows down past its row while its neighbour keeps its
resting height. Set three cards at full width to see the span, and one row to
see a card that fits.
</docs>
