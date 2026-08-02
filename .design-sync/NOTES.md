# design-sync notes

## What this repo syncs

bendrucker.me is an Astro site, not a React design system. It has **no components
to sync**: `src/components/` is 12 `.astro` files plus 8 `.vue` files, and no
workspace package exports UI. The converter runs in its `[ZERO_MATCH]` tokens-only
mode: empty `_ds_bundle.js`, everything of value in `styles.css`.

The deliverable is therefore `.design-sync/conventions.md`, which is prepended to
the uploaded README and inlined into the design agent's system prompt. It is the
only thing telling the agent what vocabulary exists. Keep it accurate.

## Build recipe

The site's `src/styles/global.css` cannot ship as-is. It is Tailwind v4 source
(`@import "tailwindcss"`, `@plugin`, `@apply`, `@theme inline`), and nothing
downstream resolves those. Compile it first:

```sh
npm ci
# @tailwindcss/cli is not a dependency. Install it transiently, matching the
# tailwindcss version in package.json.
npm i --no-save --no-package-lock @tailwindcss/cli@4.3.2

npx tailwindcss -i .design-sync/tailwind-entry.css -o tmp/ds/compiled.css
node .ds-sync/resync.mjs --config .design-sync/config.json \
  --node-modules ./.ds-sync/node_modules --entry ./tmp/ds/entry.mjs \
  --out ./ds-bundle --no-render-check
```

`tmp/ds/entry.mjs` is a one-line `export {};`. The converter requires a bundle
entry even with zero components. Recreate it if `tmp/` was cleaned.

- **`.design-sync/tailwind-entry.css` is the important file.** It wraps the real
  `global.css` and safelists the class vocabulary. Tailwind never runs downstream,
  so a class absent from the compiled output silently does nothing in every design
  the agent builds. The safelist is what makes `gap-4`, `m-2`, `grid-cols-3` etc.
  exist at all. Without it the output was 941 utility rules and full of holes.
  With it, 4036.
- **Keep the `@source not` exclusions.** Tailwind's auto-detection scans the whole
  repo and honors only the repo `.gitignore`, never the user's global one. Without
  them it scans `.worktrees/` and `tmp/`, treats class names quoted in these very
  docs as real usage, and fails on the literal `icon-[ph--*]` they mention. That
  scraped ~3KB of junk rules into the stylesheet before it was caught.
- Re-run the compile whenever `src/styles/*.css` changes. `cfg.cssEntry` points at
  the compiled output, not the source.

## Environment gotchas

- **React is not a dependency of this repo.** The converter vendors React for
  preview cards regardless of component count, so it was installed into
  `.ds-sync/node_modules` (isolated) and `--node-modules` points there, not at the
  repo's own `node_modules`. Do not add React to `package.json`.
- `npm ci` is required first. A bare checkout leaves `node_modules` nearly empty
  and `npx tailwindcss` won't resolve. `@tailwindcss/cli` is not a dependency;
  install it transiently with `npm i --no-save --no-package-lock @tailwindcss/cli@<matching version>`.
  Match the version to `tailwindcss` in `package.json`.
- `node_modules` is no longer tracked in git. An older note claimed it was a
  self-referential symlink, but that was fixed upstream. `npm ci` is safe.

## Known validate warns

Both are expected. A warn *not* on this list is new.

- `[TOKENS_MISSING]`: `--shiki-light`, `--shiki-dark`, `--shiki-light-bg`,
  `--shiki-dark-bg`, `--file-name-offset`. All five are injected inline per code
  block at runtime (`src/shiki/fileName.js:22`), never declared in a stylesheet.
  Correctly absent. Do not chase.
- `[RENDER_SKIPPED]`: accepted deliberately via `--no-render-check`. Playwright is
  not installed and the bundle has zero preview cards, so the check would open zero
  files. If components ever exist, install Playwright and drop the flag.

## Re-sync risks

- **The conventions file rots silently.** It enumerates concrete class names and
  hexes. If `src/styles/global.css` changes a token value or the safelist in
  `tailwind-entry.css` drifts, the file will confidently name vocabulary that no
  longer resolves. Re-validate every class and hex in it against the fresh
  `ds-bundle/_ds_bundle.css` on each sync. That check is cheap and was done on the
  first sync.
- **Accent hue flips between themes** (`#006cac` light → `#ff6b01` dark). If either
  changes, update the color table in `conventions.md`.
- **Arbitrary-value classes never work downstream** (`w-[327px]`, `icon-[ph--*]`).
  The safelist cannot cover them by definition. This is documented in the
  conventions file; keep that caveat if the file is rewritten.
- The site's Phosphor icons compile into `#about h2::after` selectors via `@apply`,
  not as reusable `icon-[...]` utilities, so the agent has no icon vocabulary. If
  icons ever matter, safelist specific `icon-[ph--*]` classes in
  `tailwind-entry.css`.
- If this repo ever grows a real React component package, this shape assumption
  changes entirely. Rerun detection rather than reusing `cfg.shape: "package"`
  with the empty entry.
