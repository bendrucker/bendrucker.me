# bendrucker.me — Theme Only, No Components

**This design system ships no components.** `_ds_bundle.js` is empty and
`window.BendruckerMe` has no exports. Ignore the "0 components" phrasing and the
`window.BendruckerMe.*` loading example further down. There is nothing to import.
Build with plain HTML elements and style them using the vocabulary below.

The source is [bendrucker.me](https://bendrucker.me), a personal site built in Astro.
What is bound here is its real compiled stylesheet: the theme tokens, the base
element styles, and the Tailwind utilities generated from them.

## Setup

Link the stylesheet and set a theme on the root element. There is no provider and
no JavaScript to load.

```html
<html data-theme="light">
  <head>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    ...
  </body>
</html>
```

`data-theme` must be `light` or `dark`. The dark palette only applies under
`html[data-theme="dark"]`, so omitting it leaves the page in light mode regardless
of the viewer's OS setting.

`<body>` already carries the brand defaults: `--background`, `--foreground`,
monospace type, and `display: flex; flex-direction: column; min-height: 100svh`.
Don't re-declare them on a wrapper.

## Colors

Five semantic colors, and only five. There is no numeric palette. Never write
`bg-gray-100`, `text-slate-700`, or any other Tailwind default color.

| Token         | Utility root | Light     | Dark      | Use                       |
| ------------- | ------------ | --------- | --------- | ------------------------- |
| `--background`| `background` | `#fdfdfd` | `#212737` | Page and surface fills    |
| `--foreground`| `foreground` | `#282728` | `#eaedf3` | Body text                 |
| `--accent`    | `accent`     | `#006cac` | `#ff6b01` | Links, focus, emphasis    |
| `--muted`     | `muted`      | `#e6e6e6` | `#343f60` | Secondary fills, chips    |
| `--border`    | `border`     | `#ece9e9` | `#ab4b08` | Rules, dividers, outlines |

**The accent shifts hue between themes**: blue in light, orange in dark. That is
deliberate. Never hardcode either hex; always go through `accent` so both themes
stay correct.

Each root combines with these prefixes: `bg-`, `text-`, `border-`, `outline-`,
`decoration-`, `fill-`, `stroke-`, `ring-`, `divide-`, `caret-`, `shadow-`,
`accent-`. Opacity suffixes are available on `bg-`, `text-`, `border-`, `outline-`,
`fill-`, and `ring-` at `/5` through `/95`, e.g. `bg-accent/10`, `text-foreground/70`.
Variants `hover:`, `focus-visible:`, `dark:`, `sm:`, `md:`, `lg:` are compiled for
`bg-`, `text-`, `border-`, and `outline-`.

Prefer plain utilities over `dark:`. The tokens already flip with the theme.
Reach for `dark:` only when a rule genuinely differs per theme.

## Type and Layout

- **Everything is monospace.** `body` sets `var(--font-mono)`. This is the single
  most recognizable trait of the site. Keep it. Use `font-sans` or `font-serif`
  only for a deliberate contrast.
- `max-w-app` is the page width (48rem). `<section>` and `<footer>` already get
  `mx-auto max-w-app px-4` from the base layer, so a plain `<section>` is the
  correct page container, with no wrapper divs needed.
- `.app-prose` styles long-form article content (headings, lists, tables, links,
  inline code) in the site's voice. Put it on the container of rendered markdown,
  not on individual elements.
- `<a>` and `<button>` already carry the focus treatment: a dashed accent outline
  on `:focus-visible`. Don't rebuild it.

Standard Tailwind spacing, sizing, flex, grid, border, radius, shadow, and
transition utilities are compiled and safe to use, including `sm:`/`md:`/`lg:`
variants for the common layout families.

## Constraint: The Stylesheet Is Precompiled

Tailwind does not run downstream. `styles.css` is a fixed file, so **a class that
isn't already in it does nothing**. It fails silently, with no error. Two rules
follow:

- Arbitrary-value classes (`w-[327px]`, `bg-[#ff0000]`, `icon-[ph--code-light]`)
  will not resolve. Use an inline `style` attribute or a `<style>` block with
  `var(--accent)` etc. when you need a one-off value.
- Before relying on an unusual utility, grep for it in `_ds_bundle.css` (which
  `styles.css` imports). The five color roots and the layout families above are
  guaranteed; the long tail is not.

Code blocks (`.astro-code`) read `--shiki-light`, `--shiki-dark`,
`--shiki-light-bg`, `--shiki-dark-bg`, set inline per block by the site's build.
Those are absent here, so syntax highlighting will not reproduce. Style code
samples with `bg-muted` and `text-foreground` instead.

## Example

```html
<section class="py-12">
  <h1 class="mb-2 text-3xl font-bold text-foreground">Posts</h1>
  <p class="mb-8 text-foreground/70">Notes on infrastructure and tooling.</p>

  <ul class="flex flex-col gap-6">
    <li class="border-b border-border pb-6">
      <a href="#" class="text-xl text-foreground decoration-dashed underline-offset-4 hover:text-accent">
        Caching at the edge
      </a>
      <p class="mt-1 text-sm text-foreground/60">March 2026</p>
      <p class="mt-3 text-foreground/80">
        What the Workers Cache API scopes to, and why that shapes purge design.
      </p>
    </li>
  </ul>

  <button class="mt-8 rounded border border-border bg-muted px-4 py-2 text-foreground hover:bg-accent hover:text-background">
    Load more
  </button>
</section>
```
