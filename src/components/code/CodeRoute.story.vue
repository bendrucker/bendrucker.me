<script setup lang="ts">
import { DEFAULT_FILTERS, ownerFrom, sortFrom } from "@/code/view";
import type { StoryControlSet, StoryState } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import CodeRoute from "./CodeRoute.vue";
import { CODE_LANGUAGES, CODE_ROWS } from "./fixtures";

const DATA = {
  full: CODE_ROWS,
  few: CODE_ROWS.slice(0, 3),
  none: [],
};

const controls: StoryControlSet = {
  data: {
    type: "select",
    title: "rows",
    options: { full: "full window", few: "three rows", none: "none" },
  },
  q: { type: "text", title: "from URL: q" },
  owner: {
    type: "select",
    title: "from URL: owner",
    options: ["all", "mine", "others"],
  },
  lang: {
    type: "select",
    title: "from URL: lang",
    options: { "": "any", Go: "Go", TypeScript: "TypeScript" },
  },
  sort: {
    type: "select",
    title: "from URL: sort",
    options: { recent: "recent", active: "most active", name: "name" },
  },
};

function initState() {
  return { data: "full", ...DEFAULT_FILTERS };
}

function rows(state: StoryState) {
  return state.data === "few" || state.data === "none"
    ? DATA[state.data]
    : DATA.full;
}

function initial(state: StoryState) {
  return {
    q: String(state.q ?? ""),
    owner: ownerFrom(String(state.owner)),
    lang: String(state.lang ?? ""),
    sort: sortFrom(String(state.sort)),
  };
}

// The island reads its filters from the URL once, as it mounts, so a change
// here remounts it rather than reaching into its state.
function mountKey(state: StoryState): string {
  return JSON.stringify(state);
}
</script>

<template>
  <Story
    title="Code route"
    group="code"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Code route" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <CodeRoute
          :key="mountKey(state)"
          :rows="rows(state)"
          :languages="CODE_LANGUAGES"
          :initial="initial(state)"
          this-year="2026"
        />
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Code route

The `/code` list: every repository and project touched in the last ninety
days, newest first, grouped by month.

A project stands in for its repositories, with its diamond in a ring and its
members as the description. Someone else's repository names its owner above
the title. The language shows only as the diamond's color.

The default list leads with five highlights, ranked by score. A phone shows
three and lists the other two in their months instead, so nothing appears
twice at either width. Any filter drops the highlights, and any sort but
recent flattens the months into one run with each row dated.

On a phone the filters sit in a sticky row, with search behind its toggle
until the URL carries a query. From the desktop breakpoint up they move into
the sidebar, with a rail of months to jump by. Open the full-width link on a
desktop to see it.

The "from URL" controls set the filters the page would read from its query
string, and remount the list with them.
</docs>
