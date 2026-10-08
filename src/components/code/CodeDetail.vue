<script setup lang="ts">
import type { CodeDetail } from "@/code/detailWire";
import ItemHeader from "@/components/parts/ItemHeader.vue";
import ItemRow from "@/components/parts/ItemRow.vue";
import StatTile from "@/components/parts/StatTile.vue";
import WorkList from "./WorkList.vue";

withDefaults(
  defineProps<{
    detail: CodeDetail;
    /** A page titles it with an `h1`, the list's modal with an `h2`. */
    level?: 1 | 2;
    backHref?: string;
  }>(),
  { level: 1 },
);
</script>

<template>
  <!-- A repository's or a project's substance, the same on its page and in
       the list's modal: the header, the stats, a project's repositories, and
       the work opened there. -->
  <div class="flex flex-col gap-5">
    <ItemHeader
      :title="detail.title"
      :back-href="backHref"
      :org="detail.org"
      :dek="detail.dek"
      :level="level"
    >
      <template #mark>
        <span
          v-if="detail.mark === 'ring'"
          role="img"
          aria-label="Project"
          class="inline-flex size-[17px] flex-none rotate-45 items-center justify-center rounded-[3.5px] border-2 border-current/55"
          :style="{ color: detail.dot }"
        >
          <i class="size-2 rounded-[1.5px] bg-current" />
        </span>
        <span
          v-else
          aria-hidden="true"
          class="size-3 flex-none rotate-45 rounded-[2px]"
          :style="{ background: detail.dot }"
        />
      </template>
      <template v-if="detail.githubUrl" #title-end>
        <a
          :href="detail.githubUrl"
          target="_blank"
          rel="noopener"
          aria-label="Open on GitHub"
          title="Open on GitHub"
          class="inline-flex size-9 flex-none items-center justify-center rounded-md text-dim transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-cat"
        >
          <span aria-hidden="true" class="size-4 icon-[lucide--github]" />
        </a>
      </template>
    </ItemHeader>

    <div class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-1.5">
      <StatTile
        v-for="tile in detail.tiles"
        :key="tile.label"
        :value="tile.value"
        :label="tile.label"
        :icon="tile.icon"
      />
    </div>

    <ul
      v-if="detail.members.length > 0"
      aria-label="Repositories"
      class="flex flex-col gap-1.5"
    >
      <li v-for="member in detail.members" :key="member.href">
        <ItemRow
          :href="member.href"
          :title="member.title"
          :text="member.text"
          lead="dot"
          :dot="member.dot"
          tinted
        />
      </li>
    </ul>

    <WorkList :items="detail.work" :more-href="detail.moreHref" />
  </div>
</template>
