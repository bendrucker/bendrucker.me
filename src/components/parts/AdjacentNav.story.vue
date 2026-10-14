<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import AdjacentNav from "./AdjacentNav.vue";

const NEWER = { title: "Six Months as a Dropout", href: "#newer" };
const OLDER = {
  title: "Sucking Less at Business Development",
  href: "#older",
};

const controls: StoryControlSet = {
  ends: {
    type: "select",
    title: "neighbors",
    options: { both: "both", newest: "newest post", oldest: "oldest post" },
  },
};

function initState() {
  return { ends: "both" };
}
</script>

<template>
  <Story
    title="Newer and older"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Newer and older" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div class="bg-background p-2 cat-writing">
          <AdjacentNav
            :newer="state.ends === 'newest' ? undefined : NEWER"
            :older="state.ends === 'oldest' ? undefined : OLDER"
          />
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Newer and older

The last thing on a post, moving between posts. Newer holds the left column and
older the right, so each keeps its side when the other is missing at either end
of the archive.
</docs>
