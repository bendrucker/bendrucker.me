---
name: local-loop
description: Render a change to this site locally and look at it. Covers seeding a local D1 and R2, the URLs worth requesting, and screenshotting both themes at phone and desktop widths. Use when a change touches the cycling or code activity pages, route maps, photos, or anything server-rendered.
---

# Local Loop

Recent cycling pull requests have shipped a gutter, a profile box, a wrapped
photo strip, and a clipped lightbox that no linter, test, or build caught,
because none of them looked at the page. `npm run dev:worker` serves what
production serves; this covers seeding it, the URLs worth requesting, and
screenshotting the result.

## Seed First

`npm run seed` fills D1 through the same `publishActivity` path activity-hub
writes through, so a schema change breaks the seed the way it breaks the hub.

```bash
npm run seed              # three years of synthetic rides
npm run seed -- --remote  # the real rides, exported from production D1
```

`--remote` names where the rows are read from, not where they land. It still
writes locally. `npm run fetch-activity --remote` means the opposite, so read
this one as "the real rides".

The synthetic set carries the cases recent bugs lived in: an off-season gap so
a log page skips empty months, commutes so a month footnote has something to
total, a twelve-photo ride, a ride with no power meter, and one with neither
route nor profile. It also writes placeholder photos into local R2, without
which every thumbnail 404s at `src/pages/photos/[...key].ts`.

`dev:worker` seeds on its own when the feed table is empty. Run the seed by
hand when you want `--remote`. A blank cycling page locally means
the query is broken or the database is empty, and `dev:worker`'s
`LOCAL_ERRORS` throws a stack trace saying which.

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
silent failed state once, so request a seeded month directly rather than
trusting the button.

A map URL's hash names the track it holds. Take one from the rendered page
rather than composing it, because a hash that does not match is redirected
rather than drawn.

## Screenshots

The theme is a `data-theme` attribute a reader toggles, not
`prefers-color-scheme`. Setting the OS or the emulated media changes nothing.
Set the attribute:

```bash
export AGENT_BROWSER_SESSION="$(agent-browser session id --scope worktree --prefix loop)"
agent-browser set viewport 1280 900
agent-browser open http://localhost:$PORT/activity/cycling
agent-browser screenshot tmp/desktop-light.png
agent-browser eval "document.documentElement.setAttribute('data-theme','dark'); document.documentElement.classList.add('dark')"
agent-browser screenshot tmp/desktop-dark.png
agent-browser set viewport 390 844
```

Both widths and both themes, every time. 390px is where the photo strip
wrapped and the lightbox clipped. 1280px is where the month rail appears at
all, since it is hidden below `sm`.

Route cards carry both themes as separate images and swap them in CSS, so a
dark screenshot that still shows a light basemap means the dark render failed
rather than the toggle.

## Gotchas

- `tsx` opens a unix socket for IPC, which the sandbox refuses with
  `listen EPERM`. Every `npm run seed` and `npm run dev:worker` needs
  `dangerouslyDisableSandbox`.
- Renaming a column inside a double-quoted identifier in a query produces no
  error. SQLite reads an unknown quoted identifier as a string literal, so the
  query succeeds and the column arrives null.
