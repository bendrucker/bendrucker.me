---
name: local-loop
description: Render a change to this site locally and look at it. Covers which dev server renders the page production renders, seeding a local D1 and R2, the URLs worth requesting, and screenshotting both themes at phone and desktop widths. Use when a change touches the cycling or code activity pages, route maps, photos, or anything server-rendered.
---

# Local Loop

Four of the last five cycling pull requests fixed what the one before it
shipped. A gutter only one view reserved, profiles that all filled the same box,
a photo strip that wrapped, a lightbox capped at a fixed width. Each needed the
page rendered and looked at, and none was reachable from a linter, a test, or a
build. This is how to render it.

## Which Server

`npm run dev:worker` renders what production renders. `astro dev` does not.

The reason is at `astro.config.ts:120-124`: an island wrapping a reka component
server-renders empty under `astro dev`. `SegmentedControl.vue` is the cycling
page's view switcher, so the cycling page arrives with no way to leave the log.
The gap widens from there. `astro dev` has no assets binding, no `_headers`, no
redirect rules, and no caching middleware.

Use `astro dev` for styling and client-side iteration, where HMR pays. Use
`dev:worker` for anything server-rendered, D1-backed, cached, hydration
sensitive, or wrapped in reka.

```bash
npm run dev:worker              # build, migrate, seed if empty, start
npm run dev:worker -- status    # is one running, and where
npm run dev:worker -- logs -f   # follow it
npm run dev:worker -- stop      # shut it down
```

It serves the production build. A rebuild while it runs changes nothing the
worker serves, because workerd holds the bundle it started with. Restart after
any source change.

The port comes from a hash of the worktree path rather than wrangler's 8787,
which every checkout would otherwise claim. `status` prints the one in use.

## Seed First

An empty local database is the failure this loop exists to catch, and it used to
look exactly like a quiet month. `npm run seed` fills D1 through the same
`publishActivity` path activity-hub writes through, so a schema change breaks the
seed the way it breaks the hub.

```bash
npm run seed              # three years of synthetic rides
npm run seed -- --remote  # the real rides, exported from production D1
npm run seed -- --reset   # drop the local rides first
```

`--remote` names where the rows are read from, not where they land. Both flags
write locally. `npm run fetch-activity --remote` means the opposite, so read this
one as "the real rides".

The synthetic set carries the cases the recent bugs lived in: an off-season gap
so a log page skips empty months, commutes so a month footnote has something to
total, a twelve-photo ride, a ride with no power meter, and one with neither
route nor profile. It also writes placeholder photos into local R2, without which
every thumbnail 404s at `src/pages/photos/[...key].ts`.

`dev:worker` seeds on its own when the feed table is empty. Run the seed by hand
when you want `--reset` or `--remote`.

A page that fails to read its data throws under `dev:worker` instead of rendering
empty, because the script passes `--var LOCAL_ERRORS:true` and `src/fallback.ts`
reads it. A blank cycling page locally means the query is broken or the database
is empty, and you will get a stack trace saying which.

## URLs

```bash
curl -s localhost:$PORT/activity/cycling | grep -c '"route"'   # rides carrying a polyline
curl -sI localhost:$PORT/activity/cycling | grep -i etag       # feed version
curl -s localhost:$PORT/activity/cycling/2025-09.json | jq 'keys'
curl -s localhost:$PORT/activity/code
curl -so map.png localhost:$PORT/map/15000227608/11z0jvp/150x140.png
```

The ETag is `"<version>-<count>.<maxUpdatedAt>-html"`. Re-requesting with
`If-None-Match` returns 304, which is worth checking whenever the feed's shape
changes.

The month JSON is what `loadMore` fetches. A zod failure there rendered as a
silent failed state once, so request a seeded month directly rather than trusting
the button.

A map URL's hash names the track it holds. Take one from the rendered page rather
than composing it, because a hash that does not match is redirected rather than
drawn.

## Screenshots

The theme is a `data-theme` attribute a reader toggles, not `prefers-color-scheme`.
Setting the OS or the emulated media changes nothing. Set the attribute:

```bash
export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix loop)"
agent-browser set viewport 1280 900
agent-browser open http://localhost:$PORT/activity/cycling
agent-browser screenshot tmp/desktop-light.png
agent-browser eval "document.documentElement.setAttribute('data-theme','dark'); document.documentElement.classList.add('dark')"
agent-browser screenshot tmp/desktop-dark.png
agent-browser set viewport 390 844
```

Both widths and both themes, every time. 390px is where the photo strip wrapped
and the lightbox clipped. 1280px is where the month rail appears at all, and the
rail is hidden below `sm`, so a phone screenshot cannot show a gutter bug.

Route cards carry both themes as separate images and swap them in CSS, so a dark
screenshot that still shows a light basemap means the dark render failed rather
than the toggle.

## Gotchas

- `tsx` opens a unix socket for IPC, which the sandbox refuses with
  `listen EPERM`. Every `npm run seed` and `npm run dev:worker` needs
  `dangerouslyDisableSandbox`.
- Vite dev servers need it too. The sandbox blocks the FSEvents recursive watch
  and it surfaces as `EMFILE`.
- A fresh worktree has no `node_modules`. Run `npm install` before anything here.
- `wrangler dev` on a taken port dies with a fatal workerd "Address already in
  use" rather than falling back. Two worktrees running at once are fine, since
  the port is derived per worktree, but `--port` on top of a live server is not.
- Renaming a column inside a double-quoted identifier in a query produces no
  error. SQLite reads an unknown quoted identifier as a string literal, so the
  query succeeds and the column arrives null.

## Removal

Delete this skill if a month of local runs go through ad-hoc commands without
loading it. It costs nothing per session, so the test is whether it gets used,
not whether it is cheap.
