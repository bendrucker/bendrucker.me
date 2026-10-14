<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { storyCategory } from "./fixtures";
import HighlightList, { type HighlightRow } from "./HighlightList.vue";

const ROWS: Record<string, HighlightRow[]> = {
  rides: [
    {
      href: "#ride-1",
      title: "Friends of Tam",
      text: "MV FF BF SB RRG",
      figure: "139 mi",
      hilly: true,
    },
    {
      href: "#ride-2",
      title: "Mount Diablo",
      text: "North Gate to the summit",
      figure: "62 mi",
      hilly: true,
    },
    {
      href: "#ride-3",
      title: "Point Reyes Lighthouse",
      text: "Out and back",
      figure: "108 mi",
    },
    {
      href: "#ride-4",
      title: "Hamilton",
      text: "Crothers to the observatory",
      figure: "71 mi",
      hilly: true,
    },
    {
      href: "#ride-5",
      title: "Sonoma coast",
      text: "Coleman Valley and Joy Road",
      figure: "84 mi",
    },
  ],
  code: [
    {
      href: "#repo-1",
      title: "oapi-codegen",
      org: "oapi-codegen",
      text: "Generate Go client and server boilerplate from OpenAPI 3 specifications",
      lead: "dot",
      dot: "#00ADD8",
    },
    {
      href: "#repo-2",
      title: "TFLint",
      org: "terraform-linters",
      text: "tflint, tflint-ruleset-aws, and 3 more",
      lead: "ring",
      dot: "#00ADD8",
    },
    {
      href: "#repo-3",
      title: "extensions",
      org: "raycast",
      text: "Everything you need to extend Raycast.",
      lead: "dot",
      dot: "#3178c6",
    },
    {
      href: "#repo-4",
      title: "dotfiles",
      text: "Machine setup in topic directories",
      lead: "dot",
      dot: "#89e051",
    },
    {
      href: "#repo-5",
      title: "bendrucker.me",
      text: "This is my personal website",
      lead: "dot",
      dot: "#3178c6",
    },
  ],
  writing: [
    {
      href: "#post-1",
      title: "How to Start Contributing to Open Source",
      text: "Open source lets you give back and learn more.",
      figure: "6 min",
    },
    {
      href: "#post-2",
      title: "Testing Terraform Providers",
      text: "Acceptance tests without a cloud account.",
      figure: "9 min",
    },
    {
      href: "#post-3",
      title: "Shipping a Monorepo",
      text: "Workspaces, builds, and one lockfile.",
      figure: "7 min",
    },
    {
      href: "#post-4",
      title: "On Code Review",
      text: "What a reviewer is for.",
      figure: "4 min",
    },
    {
      href: "#post-5",
      title: "Small Pull Requests",
      text: "Why size matters more than count.",
      figure: "5 min",
    },
  ],
};

const controls: StoryControlSet = {
  category: {
    type: "select",
    title: "category",
    options: { rides: "Rides", code: "Code", writing: "Writing" },
  },
  count: { type: "slider", title: "count", min: 0, max: 5 },
};

function initState() {
  return { category: "rides", count: 5 };
}

function rowsFor(state: Record<string, unknown>): HighlightRow[] {
  const rows = ROWS[String(state.category)] ?? ROWS.rides ?? [];
  return rows.slice(0, Number(state.count));
}
</script>

<template>
  <Story
    title="Highlight list"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Highlight list" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="rounded-xl tint-5 p-2"
          :class="storyCategory(state.category).scope"
        >
          <HighlightList :rows="rowsFor(state)" />
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Highlight list

The Highlights section a logged-activity route leads with: Rides, Code, and
Writing. It takes rows already mapped to `ItemRow` props, so an unhydrated
Astro page renders it as readily as a Vue island.

A desktop shows five and a phone the first three. The server can't know the
width, so the fourth and fifth ship hidden below the desktop breakpoint. Narrow
the window, or open this story on a phone, to see them drop.
</docs>
