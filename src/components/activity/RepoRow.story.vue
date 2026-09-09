<script setup lang="ts">
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";
import type { Repo } from "@/activity/types";
import RepoRow from "./RepoRow.vue";

const username = "bendrucker";

const hoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const quiet = {
  prCount: 0,
  reviewCount: 0,
  issueCount: 0,
  mergeCount: 0,
  hasMergedPRs: false,
};

const repos: Repo[] = [
  {
    name: "bendrucker.me",
    owner: username,
    description: "This is my personal website (bendrucker.me)",
    url: "https://github.com/bendrucker/bendrucker.me",
    primaryLanguage: { name: "TypeScript", color: "#3178c6", extension: "ts" },
    stargazerCount: 12,
    createdAt: "2013-01-01T00:00:00Z",
    lastActivity: hoursAgo(3),
    activitySummary: {
      prCount: 14,
      reviewCount: 3,
      issueCount: 2,
      mergeCount: 12,
      hasMergedPRs: true,
    },
    years: [2026],
  },
  {
    name: "terraform-provider-github",
    owner: "integrations",
    description:
      "Terraform GitHub provider, a long description that runs well past the room a row gives it and has to truncate",
    url: "https://github.com/integrations/terraform-provider-github",
    primaryLanguage: { name: "Go", color: "#00ADD8", extension: "go" },
    stargazerCount: 6400,
    createdAt: "2017-06-01T00:00:00Z",
    lastActivity: hoursAgo(30),
    activitySummary: {
      prCount: 2,
      reviewCount: 0,
      issueCount: 1,
      mergeCount: 1,
      hasMergedPRs: true,
    },
    years: [2026],
  },
  {
    name: "dotfiles",
    owner: username,
    description: "",
    url: "https://github.com/bendrucker/dotfiles",
    primaryLanguage: null,
    stargazerCount: 0,
    createdAt: null,
    lastActivity: "2026-08-14T18:00:00Z",
    activitySummary: quiet,
    years: [2026],
  },
];

const controls: StoryControlSet = {
  width: { type: "slider", title: "width", min: 320, max: 768 },
};

function initState() {
  return { width: 768 };
}
</script>

<template>
  <Story
    title="Repo row"
    group="code"
    auto-props-disabled
    responsive-disabled
    :layout="{ type: 'single' }"
  >
    <Variant title="In a list" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <ul
          role="list"
          class="@container border-t border-muted"
          :style="{ width: `${state.width}px`, maxWidth: '100%' }"
        >
          <li v-for="repo in repos" :key="repo.url">
            <RepoRow :repo="repo" :username="username" />
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
# Repo row

A repository as one line in a list. The three rows cover a personal repo
touched today, an external one whose owner is shown and whose description
truncates, and one with no description. Narrow the list and the description
takes the line beneath the name and the owner is left off.
</docs>
