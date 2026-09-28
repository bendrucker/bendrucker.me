<script setup lang="ts">
defineProps<{
  href: string;
  title: string;
  /** The owner, when it isn't you. */
  org?: string;
  /** The repository's description, or a project's members. */
  text?: string;
  /** A project leads with its best repository's diamond in a ring. */
  lead: "dot" | "ring";
  /** The language's color. */
  dot: string;
  /** The newest pull request's title: what was done there lately. */
  latest?: string;
}>();
</script>

<template>
  <!-- The Code card's lead: the top repository or project on a panel of its
       own, with its description and the latest pull request's title. The
       diamond is drawn larger than a row's and turns the same way on hover. -->
  <a
    :href="href"
    class="group/feature flex min-w-0 items-start gap-3 rounded-lg bg-background/60 p-3 text-foreground no-underline transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cat focus-visible:outline-solid md:gap-3.5 md:p-3.5"
  >
    <span
      v-if="lead === 'ring'"
      role="img"
      aria-label="Project"
      class="mt-2 inline-flex w-5 flex-none items-center justify-center"
    >
      <span
        class="inline-flex size-[15px] rotate-45 items-center justify-center rounded-[3px] border-2 border-current/55 transition-transform duration-600 ease-spring group-hover/feature:rotate-[225deg] motion-reduce:transition-none"
        :style="{ color: dot }"
      >
        <i class="size-[7px] rounded-[1px] bg-current" />
      </span>
    </span>
    <span
      v-else
      class="mt-2 inline-flex w-5 flex-none items-center justify-center"
    >
      <span
        class="size-[13px] rotate-45 rounded-[3px] transition-transform duration-600 ease-spring group-hover/feature:rotate-[225deg] motion-reduce:transition-none"
        :style="{ background: dot }"
      />
    </span>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span v-if="org" class="line-clamp-1 text-xs leading-[1.3] text-dim">{{
        org
      }}</span>
      <span class="line-clamp-1 text-base leading-snug font-medium">{{
        title
      }}</span>
      <span
        v-if="text"
        class="line-clamp-2 text-[13px] leading-[1.45] text-dim"
        >{{ text }}</span
      >
      <span
        v-if="latest"
        class="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-dim"
      >
        <span
          role="img"
          aria-label="Latest pull request"
          class="size-3.5 flex-none text-cat icon-[lucide--git-pull-request]"
        />
        <span class="line-clamp-1">{{ latest }}</span>
      </span>
    </span>
  </a>
</template>
