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

## Sidebar

Groups are the only ordered level of the tree. `histoire.config.ts` declares them
under `tree.groups`, Histoire renders them in that order, and everything below a
group sorts by title. A story joins one with `group="<id>"`. Stories that name no
group collect in a default group appended last.

```ts
tree: {
  groups: [
    { id: "cycling-views", title: "Cycling views" },
    { id: "ride", title: "Ride" },
  ],
}
```

Prefer a group over a `Section/` prefix in the title. The prefix builds a third
level of tree, and on a phone every level is another tap between the root and a
component.

## Layout

A grid story whose `width` exceeds the viewport never finishes measuring itself.
`gridColumnWidth` and `viewWidth` stay at their initial `1` and the story renders
as a one-pixel sliver. There is no error. The mobile grid gutters the row by
16px a side, leaving 358px of the 390px viewport the book is reviewed at.

Two safe choices:

- `width: 340` or less renders everywhere and still gives two desktop columns.
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

A `single` story ignores the viewport. Its preview opens at a `responsiveWidth`
stored in localStorage, defaulting to 720, and the toolbar is the only way to
change that number. Below 640px the toolbar is gone. The story lands on a phone
pinned to whatever the last desktop visit left behind, and the reader sees the
left 390px of it.

`responsive-disabled` on the `<Story>` drops the toolbar and the resize handles
and fits the frame to the pane. Set it on any single-layout story a phone
reviewer needs to read.

One case wants the opposite. A component that does not exist at phone width, a
`hidden sm:flex` rail among them, renders correctly as nothing in a 390px frame,
and nothing is not reviewable. Leave the responsive preview on and say so in the
docs block. `PreviewControls` renders a "full width" link out to
`__sandbox.html` for readers who want the story at their real width with no
chrome around it.

## Variants

A variant costs a full screen of scrolling on a phone. Most differences belong in
the controls instead. Anything a reader changes one axis at a time is a control:
which fixture is loaded, units, size, container width. The empty list, the
overflowing name, and the record period nothing in the data carries are all
entries in an `HstSelect`, not three more variants.

Keep a separate variant where a control cannot reach:

- **Comparison** — several renderings on screen at once, such as all three stat
  sizes side by side.
- **Composition** — the component inside the markup that surrounds it on the real
  page, which is where spacing and alignment go wrong.
- **Behavior** — a different harness driving it, such as a scroll spy setting the
  active month rather than a control.

Name what the variant proves. "Photos removed while open" beats "Variant 3".

## State and Controls

`initState` seeds a reactive object shared by the default slot, the `#controls`
slot, and the side panel. It runs once per variant mount and can be async. Put it
on the variant that has the controls. A `<Story>`-level `initState` reaches the
variants with no `#controls` slot too, and each of those renders a raw state
editor in the panel where the reader expects "No controls available".

Below 640px Histoire drops the side panel entirely. Controls written only into
`#controls` are unreachable on the device the book is reviewed from, so declare
them once and render them twice: `PreviewControls` inside the story, where a
phone can reach them, and `PanelControls` in `#controls`, where a desktop
reviewer expects them. Both write the same `state` object, so the two stay in
step.

```vue
<script setup lang="ts">
import { logEvent } from "histoire/client";
import type { StoryControlSet } from "@/stories/controls";
import PanelControls from "@/stories/PanelControls.vue";
import PreviewControls from "@/stories/PreviewControls.vue";

const controls: StoryControlSet = {
  size: { type: "select", title: "size", options: ["sm", "md"] },
};

function initState() {
  return { modelValue: "log", size: "md" as "sm" | "md" };
}
</script>

<template>
  <Story
    title="Segmented control"
    group="primitives"
    auto-props-disabled
    :layout="{ type: 'grid', width: 340 }"
  >
    <Variant title="Mode tabs" :init-state="initState">
      <template #default="{ state }">
        <PreviewControls :controls="controls" :state="state" />
        <SegmentedControl
          v-model="state.modelValue"
          :options="modes"
          label="View mode"
          :size="state.size"
          @update:model-value="logEvent('update:modelValue', $event)"
        />
      </template>

      <template #controls="{ state }">
        <PanelControls :controls="controls" :state="state" />
      </template>
    </Variant>
  </Story>
</template>
```

`src/stories/controls.ts` defines the four descriptor types: `select`, `slider`,
`checkbox`, and `text`. A control the descriptors cannot express belongs in the
`#controls` slot as a raw `Hst*` component, with the phone case handled by hand.

Prefer this over a local `ref` plus a hand-written readout. A reviewer on a phone
can drive `state`. They cannot edit the file.

An `HstSelect` truncates a label around 20 characters while the control is
closed. Keep option labels short and let the docs block carry the explanation.

Auto-props fills the panel when no `#controls` slot exists, and it does read
type-only `defineProps<T>()`. It degrades in two ways: it reports only the
JavaScript constructor, so `size?: "sm" | "md"` becomes a free-text box rather
than a picker, and it does not seed current values, so fields start empty.

Writing `#controls` does not displace that panel. The two stack, so a component
taking an object prop puts a full-height JSON editor above the controls you
wrote. `auto-props-disabled` on the `<Story>` suppresses it and propagates to
every variant. The prop is missing from `components.d.ts` but real at runtime,
and HMR does not apply it, so reload the page before deciding it did nothing.

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
- A `<Story>`-level `initState` hands every uncontrolled variant a raw state
  editor.
- A `single` story clips at 720px on a phone until `responsive-disabled` is set.
- Controls written only into `#controls` vanish below 640px, along with the whole
  side panel.
- `provideUnits()` called from `setupApp` does nothing, because the Composition
  API `provide()` needs a component instance. Use `app.provide(key, value)`.

## Verifying

`npm run story:build` then serve `.histoire/dist` with a single-page-application
fallback, since a story deep link has no HTML of its own. Check at 390x844 before
claiming a story is reviewable. The dev server needs `dangerouslyDisableSandbox`,
because the sandbox blocks the FSEvents watch Vite relies on.

Chrome cannot be resized below its minimum window width, so drive the book
through a 390x844 iframe on a second port instead. A story id comes from its
path: `src/components/cycling/RideCard.story.vue` becomes
`src-components-cycling-ridecard-story-vue`, and its variants append `-0`, `-1`.
Below 640px a story with several variants opens on a picker rather than a
variant, so deep link with `?variantId=` to land on one.

`responsivePresets` in `histoire.config.ts` covers the desktop half of this. It
frames a single-layout story at a real phone size with the sidebar and panel
still in reach.

`astro check` skips `.vue` files, so nothing type-checks a story. ESLint and
opening it are the only two things standing between a broken `state` key and a
reviewer. Open every variant you touched.
