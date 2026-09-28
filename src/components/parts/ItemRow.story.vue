<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import type { CategoryId } from "@/categories";
import { ALBUM, PODCAST, POSTER, storyCategory } from "./fixtures";
import ItemRow, { type RowLead } from "./ItemRow.vue";
import TimelineGutter from "./TimelineGutter.vue";
import type { PartIcon } from "./icons";

interface RowSample {
  key: string;
  label: string;
  category: CategoryId;
  day: string;
  sub?: string;
  row: {
    href: string;
    title: string;
    org?: string;
    text?: string;
    note?: string;
    lead?: RowLead;
    dot?: string;
    kind?: PartIcon;
    leadLabel?: string;
    art?: string;
    podcast?: boolean;
    figure?: string;
    hilly?: boolean;
    ticks?: number[];
    tickLabel?: string;
    via?: string;
  };
}

const samples: RowSample[] = [
  {
    key: "ride",
    label: "Ride",
    category: "rides",
    day: "11",
    row: {
      href: "#ride",
      title: "Friends of Tam",
      text: "MV FF BF SB RRG",
      figure: "139 mi",
      hilly: true,
    },
  },
  {
    key: "repo",
    label: "Repository",
    category: "code",
    day: "11",
    row: {
      href: "#repo",
      title: "oapi-codegen",
      org: "oapi-codegen",
      text: "Generate Go client and server boilerplate from OpenAPI 3 specifications",
      lead: "dot",
      dot: "#00ADD8",
    },
  },
  {
    key: "project",
    label: "Project",
    category: "code",
    day: "19",
    row: {
      href: "#project",
      title: "TFLint",
      org: "terraform-linters",
      text: "tflint, tflint-ruleset-aws, and 3 more",
      lead: "ring",
      dot: "#00ADD8",
    },
  },
  {
    key: "post",
    label: "Post",
    category: "writing",
    day: "19",
    sub: "feb",
    row: {
      href: "#post",
      title: "How to Start Contributing to Open Source",
      text: "Open source lets you give back and learn more.",
    },
  },
  {
    key: "reading",
    label: "Reading",
    category: "reading",
    day: "4",
    row: {
      href: "#reading",
      title: "The Overstory",
      text: "Richard Powers",
      note: "Your note, from the review.",
      lead: "kind",
      kind: "book",
      leadLabel: "Book",
      via: "Goodreads",
    },
  },
  {
    key: "watching",
    label: "Watching",
    category: "watching",
    day: "2",
    row: {
      href: "#watching",
      title: "Severance",
      text: "Season 2",
      lead: "poster",
      art: POSTER,
      leadLabel: "Severance poster",
      ticks: [1, 1, 1, 1, 1, 1, 1, 0.6, 0, 0],
      tickLabel: "7 of 10 episodes watched",
      via: "Trakt",
    },
  },
  {
    key: "album",
    label: "Album",
    category: "listening",
    day: "1",
    row: {
      href: "#album",
      title: "In Rainbows",
      text: "Radiohead",
      lead: "sleeve",
      art: ALBUM,
      leadLabel: "In Rainbows cover",
      via: "Apple Music",
    },
  },
  {
    key: "podcast",
    label: "Podcast",
    category: "listening",
    day: "1",
    row: {
      href: "#podcast",
      title: "Acquired",
      text: "Ben Gilbert and David Rosenthal",
      lead: "sleeve",
      art: PODCAST,
      podcast: true,
      leadLabel: "Acquired cover",
      via: "Apple Podcasts",
    },
  },
];

const controls: StoryControlSet = {
  query: { type: "text", title: "search" },
  compact: { type: "checkbox", title: "home row" },
  gutter: { type: "checkbox", title: "gutter" },
  width: { type: "slider", title: "width", min: 240, max: 680, step: 10 },
};

function initState() {
  return { query: "", compact: false, gutter: true, width: 680 };
}
</script>

<template>
  <Story
    title="Row"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Row" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <ul
          class="flex flex-col gap-4"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <li
            v-for="sample in samples"
            :key="sample.key"
            class="rounded-2xl tint-5 p-2"
            :class="storyCategory(sample.category).scope"
          >
            <p class="mb-1 px-1 label-caps">{{ sample.label }}</p>
            <ItemRow
              v-bind="sample.row"
              :query="state.query"
              :compact="state.compact"
            >
              <template v-if="state.gutter && !state.compact" #gutter>
                <TimelineGutter :day="sample.day" :sub="sample.sub" week-end />
              </template>
            </ItemRow>
          </li>
        </ul>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Row

The one row every route list is built from. What leads it says what the item
is: nothing for a ride or a post, a language diamond for a repository, the same
diamond nested in a ring for a project, a type icon for reading, a poster for
watching, a sleeve for listening.

A row that opens a page here ends in a chevron. A row that leaves the site ends
in an outward arrow and says where it goes.

Type in search to see every rendered field marked, not only the title. Turn on
the home row to see the compact form the home cards use: one line, drawn
without the gutter or the chevron, since the card is the container.
</docs>
