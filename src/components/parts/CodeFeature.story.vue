<script setup lang="ts">
import { CODE_ROWS } from "@/components/code/fixtures";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import CodeFeature from "./CodeFeature.vue";

const LATEST = "Refresh the menu bar in the background";

const controls: StoryControlSet = {
  row: {
    type: "select",
    title: "row",
    options: Object.fromEntries(CODE_ROWS.map((row, i) => [i, row.title])),
  },
  latest: { type: "checkbox", title: "latest pull request" },
  width: { type: "slider", title: "width", min: 280, max: 560, step: 10 },
};

function initState() {
  return { row: "0", latest: true, width: 358 };
}

function featureProps(index: string, latest: boolean) {
  const row = CODE_ROWS[Number(index)] ?? CODE_ROWS[0];
  return {
    href: "#",
    title: row?.title ?? "",
    org: row?.org || undefined,
    text: row?.text || undefined,
    lead: row?.lead ?? "dot",
    dot: row?.dot ?? "#8b8b8b",
    latest: latest ? LATEST : undefined,
  };
}
</script>

<template>
  <Story
    title="Code feature"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Code card lead" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="rounded-xl tint-5 p-4 cat-code"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <CodeFeature v-bind="featureProps(state.row, state.latest)" />
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Code feature

The Code home card leads with its top repository or project on a panel of its
own: the owner when it isn't Ben, the name, the description, and the title of
the newest open or merged pull request there. A repository leads with its
language's diamond and a project with the diamond in a ring, both drawn larger
than a row's. Hover turns the diamond as a row's does.

Pick a project row (TFLint) to see the ring. Turn off the pull request to see
a repository with nothing landed in the window.
</docs>
