---
name: component-stories
description: Write and review Histoire component stories in this repo. Covers layout widths that survive a phone, initState and Hst* controls, logEvent, docs blocks, and the silent failures that produce no error. Use when creating or editing any *.story.vue file.
paths: src/**/*.story.vue
---

# Component Stories

Stories are reviewed from a phone. Every pull request deploys the book to a
Cloudflare preview alias and comments the link, so the reader has no checkout,
no dev server, and a 390px viewport. That reader is the audience.

## Current API

Histoire is pinned to a `1.0.0-beta.1` whose surface moves between releases.
Rather than trusting prose, read the installed types:

```
node_modules/@histoire/plugin-vue/components.d.ts
```

239 hand-authored lines with JSDoc on every `<Story>` and `<Variant>` prop,
ending in a `GlobalComponents` block naming all 17 `Hst*` controls. It always
matches the installed version. Per-control props live under
`node_modules/@histoire/controls/dist/components/`, which is compiler output and
uglier, but readable.

The rest of this file covers what the types do not say.

## Layout

A grid story whose `width` exceeds the viewport never finishes measuring itself.
`gridColumnWidth` and `viewWidth` stay at their initial `1` and the story renders
as a one-pixel sliver. There is no error. At a 390px viewport the cliff sits
between 380 and 420.

Two safe choices:

- `width: 380` or less renders everywhere and still gives two desktop columns.
- `width: '100%'` resolves against the live view width, so it fits any viewport.
  It pins the story to a single column at every size, which costs nothing for
  content that was already too wide to pair up.

Pick the pixel width when variants are worth comparing side by side. Pick the
percentage when one variant already fills the row.

`layout` on a `<Variant>` does nothing. The grid reads it from the current story
only. To constrain a single variant, wrap its content:

```vue
<Variant title="Narrow">
  <div class="w-[340px]">
    <RideCard :ride="crowdedRide" />
  </div>
</Variant>
```

The responsive-viewport toolbar renders only for `layout: { type: 'single' }`.
Grid stories cannot reach `responsivePresets` at all.

## Variants

Name what the variant proves, not what it contains. "Photos removed while open"
beats "Variant 3". Four kinds are worth covering, and most components need three
of them:

- **Canonical** — the ordinary case a reader should picture.
- **State** — each meaningfully different configuration.
- **Edge** — empty, single item, overflowing text, longest plausible value.
- **Invalid** — data the component should survive rather than render, such as a
  record period nothing in the data carries.

A variant that only restates another variant's props is noise on a phone, where
every variant costs a full screen of scrolling.

## State and Controls

`initState` seeds a reactive object shared by the default slot, the `#controls`
slot, and the side panel. It runs once per variant mount and can be async. Set it
on a `<Variant>` to override the `<Story>`-level one.

```vue
<script setup lang="ts">
import { logEvent } from "histoire/client";

function initState() {
  return { modelValue: "log", size: "md" as "sm" | "md" };
}
</script>

<template>
  <Story
    title="Cycling/Segmented control"
    :layout="{ type: 'grid', width: 380 }"
  >
    <Variant title="Mode tabs" :init-state="initState">
      <template #default="{ state }">
        <SegmentedControl
          v-model="state.modelValue"
          :options="modes"
          label="View mode"
          :size="state.size"
          @update:model-value="logEvent('update:modelValue', $event)"
        />
      </template>

      <template #controls="{ state }">
        <HstSelect v-model="state.size" title="size" :options="['sm', 'md']" />
      </template>
    </Variant>
  </Story>
</template>
```

Prefer this over a local `ref` plus a hand-written readout. A reviewer on a phone
can drive `state` from the panel. They cannot edit the file.

Auto-props fills the panel when no `#controls` slot exists, and it does read
type-only `defineProps<T>()`. It degrades in two ways worth knowing: it reports
only the JavaScript constructor, so `size?: "sm" | "md"` becomes a free-text box
rather than a picker, and it does not seed current values, so fields start empty.
Write `#controls` explicitly for anything a reviewer should actually change.

## Events

```ts
import { logEvent } from "histoire/client";
```

A plain import. Not a slot prop, and not on an `Hst` global. Nothing is captured
automatically, so every event is logged by hand.

The Events tab carries a live count badge that accumulates while the reviewer is
parked on Controls, which makes events genuinely useful on a phone. Log the
emits that carry a decision: a selection change, an opened photo, a navigation.
Skip the ones that fire continuously.

One cost to weigh. The Source panel's Dynamic mode reconstructs markup from
runtime vnodes, and it only recognizes handlers shaped exactly like
`($event) => target = $event`. A `logEvent` call fails that match and dumps
compiled handler internals instead. Static mode still shows the real file text,
but it does not switch over on its own.

## Docs

```vue
<docs lang="md">
# Ride card

One ride as it appears in the log.
</docs>
```

`lang="md"` is mandatory. Without it the transform never fires, the docs stay
empty, and nothing reports an error.

Docs attach per story, not per variant, and render through `v-html`, so prose and
code fences work but embedded Vue components are inert markup. The text feeds a
search index, which is how a phone reader finds a component by describing it.

A sibling file named exactly `<Name>.story.md` overrides an inline block for both
rendering and search. Use one or the other. A `.story.md` with no matching
component becomes a standalone docs page, taking `id`, `title`, `icon`,
`iconColor`, and `group` from YAML frontmatter. There is no ordering field, so
sidebar position comes from the title string alone.

Code fences are pinned to the `github-dark` Shiki theme with the background
stripped, so verify fenced code in light mode before leaning on it.

## Silent Failures

Each of these produces no error and no warning:

- `<docs>` without `lang="md"` renders nothing.
- `layout` on a `<Variant>` is ignored.
- A grid `width` over the viewport collapses the story to one pixel.
- A sibling `.story.md` silently wins over an inline `<docs>` block.
- `provideUnits()` called from `setupApp` does nothing, because the Composition
  API `provide()` needs a component instance. Use `app.provide(key, value)`.

## Verifying

`npm run story:build` then serve `.histoire/dist` with a single-page-application
fallback, since a story deep link has no HTML of its own. Check at 390x844 before
claiming a story is reviewable. The dev server needs `dangerouslyDisableSandbox`,
because the sandbox blocks the FSEvents watch Vite relies on.
