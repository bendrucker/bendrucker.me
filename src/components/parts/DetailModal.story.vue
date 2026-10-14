<script setup lang="ts">
import { logEvent } from "histoire/client";
import type { CodeDetail as Detail } from "@/code/detailWire";
import CodeDetail from "@/components/code/CodeDetail.vue";
import { PROJECT_DETAIL, REPO_DETAIL } from "@/components/code/fixtures";
import type { Units } from "@/components/cycling/types";
import RideDetail from "@/components/rides/RideDetail.vue";
import {
  bareDetail,
  epicDetail,
  everydayDetail,
  THIS_YEAR,
  travelDetail,
} from "@/components/rides/fixtures";
import type { RideDetailWire } from "@/rides/detail";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import DetailModal from "./DetailModal.vue";

const rides: Record<string, RideDetailWire> = {
  epic: epicDetail,
  everyday: everydayDetail,
  video: travelDetail,
  bare: bareDetail,
};

const code: Record<string, Detail> = {
  repo: REPO_DETAIL,
  project: PROJECT_DETAIL,
};

const controls: StoryControlSet = {
  item: {
    type: "select",
    title: "item",
    options: {
      epic: "ride, everything",
      everyday: "ride, no shots",
      video: "ride, video first",
      bare: "ride, no map",
      repo: "repository",
      project: "project",
    },
  },
  status: {
    type: "select",
    title: "status",
    options: ["loaded", "loading", "failed"],
  },
  units: { type: "select", title: "units", options: ["imperial", "metric"] },
};

function initState() {
  return {
    open: true,
    item: "epic",
    status: "loaded",
    units: "imperial" as Units,
  };
}

function close(state: { open: boolean }) {
  logEvent("close", {});
  state.open = false;
}
</script>

<template>
  <Story
    title="Detail modal"
    group="parts"
    auto-props-disabled
    :layout="{ type: 'grid', width: '100%' }"
  >
    <Variant title="Over a list" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <div
          class="min-h-[70vh] p-4"
          :class="state.item in code ? 'tint-5 cat-code' : 'tint-5 cat-rides'"
        >
          <button
            type="button"
            class="rounded-lg bg-background px-3 py-2 text-sm text-cat"
            @click="state.open = true"
          >
            Open the modal
          </button>
          <DetailModal
            :open="state.open"
            :label="rides[state.item]?.name ?? code[state.item]?.title ?? ''"
            :noun="state.item in code ? 'item' : 'ride'"
            full-href="#full-page"
            close-href="#list"
            :loading="state.status === 'loading'"
            :failed="state.status === 'failed'"
            :hero="state.item in rides"
            @close="close(state)"
          >
            <RideDetail
              v-if="rides[state.item]"
              :ride="rides[state.item]!"
              :units="state.units"
              :this-year="THIS_YEAR"
              :level="2"
            />
            <CodeDetail
              v-else-if="code[state.item]"
              :detail="code[state.item]!"
              :level="2"
            />
          </DetailModal>
        </div>
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>

<docs lang="md">
# Detail modal

An item from a list, opened over it: a ride over the Rides log, a repository
or a project over the Code list. Its row still links to the item's own page,
and "Full page" goes there.

On a phone it is a bottom sheet that fills most of the screen and scrolls
inside, with a grabber across the top. From the desktop breakpoint up it is a
centred dialog about 680px wide. It is a native `<dialog>` opened with
`showModal()`, so focus stays inside and the list behind it is inert. Esc,
the close button, and a tap on the backdrop all close it.

While the item loads, a placeholder in the item's shape holds the dialog's
size. A ride's placeholder leads with the map.

The story has no worker, so a ride's map draws its line on the card's own
ground and the shots use the fixtures' thumbnails. Close it and "Open the
modal" brings it back.
</docs>
