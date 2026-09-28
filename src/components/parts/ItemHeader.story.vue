<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import { storyCategory } from "./fixtures";
import ItemHeader from "./ItemHeader.vue";
import StatTile from "./StatTile.vue";

interface HeaderSample {
  category: string;
  title: string;
  backLabel: string;
  date?: string;
  org?: string;
  dek?: string;
  size: "page" | "post";
  lead?: boolean;
}

const samples: Record<string, HeaderSample> = {
  ride: {
    category: "rides",
    title: "Friends of Tam",
    backLabel: "Rides",
    date: "Saturday, July 11",
    dek: "MV FF BF SB RRG",
    size: "page",
  },
  repo: {
    category: "code",
    title: "oapi-codegen",
    backLabel: "Code",
    org: "oapi-codegen",
    dek: "Generate Go client and server boilerplate from OpenAPI 3 specifications",
    size: "page",
    lead: true,
  },
  post: {
    category: "writing",
    title: "Friends of Tam",
    backLabel: "Writing",
    date: "Tuesday, September 15",
    dek: "Open source lets you give back and learn more.",
    size: "post",
  },
  long: {
    category: "writing",
    title:
      "How to Start Contributing to Open Source Without Waiting to Be Asked",
    backLabel: "Home",
    date: "Friday, February 19, 2021",
    size: "post",
  },
};

const controls: StoryControlSet = {
  sample: {
    type: "select",
    title: "page",
    options: {
      ride: "ride",
      repo: "repository",
      post: "post",
      long: "long title",
    },
  },
  width: { type: "slider", title: "width", min: 240, max: 680, step: 10 },
};

function initState() {
  return { sample: "ride", width: 340 };
}

function sample(key: unknown): HeaderSample {
  return samples[String(key)] ?? samples.ride!;
}
</script>

<template>
  <Story
    title="Item header"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Item header" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="bg-background p-3"
          :class="storyCategory(sample(state.sample).category).scope"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <ItemHeader
            :title="sample(state.sample).title"
            back-href="#"
            :back-label="sample(state.sample).backLabel"
            :date="sample(state.sample).date"
            :org="sample(state.sample).org"
            :dek="sample(state.sample).dek"
            :size="sample(state.sample).size"
          >
            <template v-if="sample(state.sample).lead" #lead>
              <span
                class="mt-2 size-3 flex-none rotate-45 rounded-[2px] bg-[#00ADD8]"
              />
            </template>
            <template v-if="state.sample === 'repo'" #actions>
              <div class="mt-2 grid grid-cols-2 gap-1.5">
                <StatTile value="8,594" label="stars" icon="star" />
                <StatTile value="Aug 2026" label="since" />
              </div>
            </template>
          </ItemHeader>
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Item header

The top of every item page: a back link naming where it returns, the date as a
label, the title, and your description as a dek. A repository puts its owner
above the title and its diamond ahead of it.

A post's title and dek run larger than an item page's. The long title shows
where a post's title wraps at a phone's width.
</docs>
