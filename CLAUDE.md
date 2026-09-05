# bendrucker.me

Personal website/blog: Astro → Cloudflare Workers. TailwindCSS v4, Vue, npm workspaces (`packages/*`, `workers/*`).

## Structure

- `src/config.ts` — `SITE` constant (metadata, feature flags)
- `src/content/blog/*.md` — posts (frontmatter: `title`, `publishDate` required; `subtitle`, `categories`, `series` optional)
- `src/pages/` — routes: `posts/`, `activity/code.astro`, `activity/cycling.astro`, `tags/`, `archives/`, `about.md`, `rss.xml.ts`, `og.png.ts`, `map/`
- `src/map/` — vector basemap rendering for the route cards
- `src/layouts/` — `Layout`, `PostDetails`, `AboutLayout`, `Main`
- `src/styles/global.css` — theme variables + Tailwind `@theme inline`
- `static/` — images, fonts (copied to `public/` at build)
- `packages/logger` — shared pino logger; `packages/github` — GitHub API client
- `workers/github` — cron (hourly): GitHub API → D1
- `terraform/` — Terraform root: Cloudflare DNS and redirect rules

## Commands

```bash
npm run dev           # Spotlight + Astro dev server
npm run dev:json      # Astro dev server with JSON logs (no Spotlight)
npm run build         # packages → wrangler types → astro check → astro build
npm test              # vitest, whole suite
npm run lint          # oxlint + ESLint
npm run lint:types    # oxlint's type-aware rules, via tsgolint
npm run format        # Prettier
npm run story:dev     # Histoire component stories on :6006
npm run story:build   # Static story book into .histoire/dist
```

The suite is the cheapest check here, a few seconds for the whole of it, and
`src/test/db.ts` is why: `createTestDb()` runs the migrations into in-memory
SQLite and `testStore()` supplies the `ActivityStore` seam the write path takes,
so a D1-backed query is testable in milliseconds with no D1 anywhere. Prefer it
over a real database when reproducing a data bug.

`lint` is the tight local loop. `lint:types` runs that same rule set with a type
checker attached, several seconds rather than a fraction of one, so CI runs it
in place of `lint` rather than after it.

Four rules need the type checker. `typescript/no-unsafe-type-assertion` is the
one that shapes how code gets written: data arriving from KV, a GraphQL
response, or a file is parsed with a zod schema and typed from it via `z.infer`,
rather than asserted with `as`. `no-floating-promises`, `no-implied-eval`, and
`restrict-template-expressions` catch what their names say.

tsgolint reads only `.ts`, so a cast or a dropped promise in a `.vue` or
`.astro` file reaches no linter and is the reviewer's to catch.

### Component Stories

Vue components are developed against Histoire (`*.story.vue`, colocated with the
component). `histoire.config.ts` restates the parts of `astro.config.ts` that
Histoire's own Vite server needs: `@vitejs/plugin-vue` for the SFC compiler,
Tailwind, and the `@` alias. `src/histoire.setup.ts` imports `global.css` and
mirrors Histoire's dark-mode class onto `data-theme`, so stories render in the
site's real light and dark palettes.

Every pull request deploys the story book to a Cloudflare preview alias,
reachable from the PR's deployments, so a component can be reviewed from a phone
with nothing checked out. `workers/stories/wrangler.toml` serves `.histoire/dist`
with a single-page-application fallback, since a story deep link has no HTML of
its own.

Histoire hides its side panel below 640px, so a story declares its controls once
in `src/stories/controls.ts` terms and renders them through both
`PreviewControls` (inside the story, reachable on a phone) and `PanelControls`
(in the `#controls` slot).

`.claude/skills/component-stories/SKILL.md` covers how to write one, including
the layout widths that survive a phone and the several ways a story fails without
reporting anything.

Three gotchas:

- Its ignore globs are matched without micromatch's `dot` option. Worktrees live
  under `.worktrees/`, and a leading `**/` cannot cross that dot segment, so
  `storyIgnored` also lists root-anchored absolute patterns. Without them the
  watcher walks `node_modules` and dies with `EMFILE`.
- Those anchored patterns cover directories only. `.git` is a file in a worktree,
  and globby throws `ENOTDIR` statting a path beneath it, which fails the build
  rather than the dev server.
- The Claude Code sandbox blocks the macOS FSEvents recursive watch that Vite
  relies on, which surfaces as the same `EMFILE`. Story and Astro dev servers
  have to run outside it.

### Background Dev Server

`npm run dev` wraps `spotlight run astro dev`, which holds the terminal. To
drive the server without blocking, call the Astro CLI directly:

```bash
astro dev --background    # start detached
astro dev status          # is one running?
astro dev logs --follow   # tail its output
astro dev stop            # shut it down
curl localhost:4321/_astro/status
```

Astro detects agents and turns on background mode plus JSON logging by itself,
so these flags are usually unnecessary. Set `ASTRO_DEV_BACKGROUND=0` to force a
foreground run, which is the only way to see startup errors that kill the
process before it is ready.

## Stop Hook

`.claude/hooks/verify.sh` runs on turns touching a file Prettier, a linter, or
the build reads: `.js`, `.mjs`, `.cjs`, `.ts`, `.astro`, `.vue`, `.css`, `.md`,
`.json`. It formats with Prettier, runs oxlint and ESLint, runs the suite, and
builds (cached against a marker). Exit 2 blocks Claude until fixed.

The build runs only once the four cheap checks pass. Together they cost about
seven seconds against the build's twenty-five, and a turn with a lint error or a
red test has something to fix without waiting for one.

## Route Maps

`RouteMap.vue` draws a route line over a basemap PNG that the worker renders
from CARTO vector tiles. `src/pages/map/[id]/[hash]/[spec].png.ts` reads the
ride's polyline from D1, frames it with the same `fitRoute` the component uses,
fetches the covering tiles, and rasterizes an SVG through the `@cf-wasm/resvg`
pipeline that already backs the OG images.

CARTO's raster basemaps are retired and stamp "API KEY REQUIRED" across every
tile they serve, keyed or not. Nothing builds a raster tile URL any more. The
vector tiles serve unkeyed today, so `CARTO_BASEMAP_KEY` is an optional worker
secret that gets appended once CARTO extends the requirement to vector. Set it
with `wrangler secret put`, which keeps it out of the client bundle.

The free tier is granted in exchange for keeping CARTO's and OpenStreetMap's
credits visible, which `CyclingActivity.vue` renders once beneath the views. A
card at 150px cannot carry them itself.

Three constraints shape the design:

- The source publishes to zoom 14 and `fitRoute` frames a short ride at 15, so
  those tiles come from their zoom 14 parent and get drawn at twice the size
  into a clipped quadrant. `src/map/tiles.test.ts` pins that math.
- A vector tile is 165KB against 55KB for the equivalent PNG, and a cycling feed
  draws a map per card. Rendering server-side is what keeps a page from pulling
  several megabytes of tiles.
- Rules are drawn across every tile before the next rule, so one tile's water
  cannot land on the roads its neighbour already drew.

Images are addressed by a hash of the ride's track and `BASEMAP_VERSION`, which
makes them immutable: a re-synced ride or a restyle moves to a new URL rather
than waiting out a cache. The browser gets `Cache-Control` and `ETag` from the
route, and Cloudflare's edge gets `Cloudflare-CDN-Cache-Control` from
`cache.set()`. A conditional request is answered before any tile is fetched.
Upstream tile fetches ask for `cacheEverything`, which keeps repeat renders off
CARTO's quota.

The endpoint is public and a render costs several tile fetches, so it only
draws a URL whose hash names the track it holds. A page cached before the ride
was re-synced asks for a hash that no longer matches and is redirected to the
current image, which leaves no URL a caller can vary to make the worker draw on
demand. Sizes are checked against `RIDE_MAP` and `HIGHLIGHT_MAP`, which the
cards also take their defaults from, and ids that would need escaping are
refused rather than guessed at, since Astro decodes a path param with
`decodeURI`. A request the route turns down, like an image that fails to load,
leaves the route line on the card's own ground. The story book has no worker and
renders every card that way.

A card carries both themes as separate images and swaps them with CSS, because
the site's theme is an attribute a reader toggles rather than an OS setting.
That costs two image requests where one is shown, in exchange for a toggle that
needs no JavaScript and no round trip. Each image is rendered once and then
served from the edge, so the doubling is bandwidth rather than renders.

## Theme

CSS vars in `global.css` → Tailwind: `bg-background`, `text-foreground`, `bg-accent`, `text-accent`, `bg-muted`, `text-muted`, `border-border`. Dark mode via `data-theme="dark"` / `dark:` prefix. No `skin-*` classes.

## Icons

Every icon comes from an Iconify collection through `@iconify/tailwind4`, as a
class like `icon-[lucide--flame]`. Never an emoji, and never a Unicode glyph
standing in for an icon: both inherit the reader's font and land at whatever
weight and baseline that font gives them.

Lucide is the collection for the cycling components, Phosphor (`ph`) for the
about page. Stay within the collection already in use on a page.

Tailwind extracts class candidates from source text, so an interpolated class
name generates no CSS. Data carries a semantic name and a component maps it to a
class written out in full. `src/components/cycling/LucideIcon.vue` is the
pattern, and `IconName` in `types.ts` is the list of names it accepts.

## Workers

All deploy via GitHub Actions matrix on push to `main`. Use `@workspace/logger` for logging.

| Worker | Config                         | Purpose              |
| ------ | ------------------------------ | -------------------- |
| www    | `wrangler.toml`                | Main site, reads D1  |
| github | `workers/github/wrangler.toml` | GitHub activity → D1 |

Run `npx wrangler types` after changing any `wrangler.toml`. The `types` CI job
regenerates types at the root and in each worker. On a pull request from a
branch in this repository it commits and pushes any drift back to the branch,
which is what keeps Dependabot's `wrangler` bumps mergeable without a local
checkout. Elsewhere (pushes to `main`, pull requests from forks) it still fails
on any diff, so commit regenerated `worker-configuration.d.ts` files whenever
`wrangler` is bumped or a `wrangler.toml` changes.

A push authenticated with `GITHUB_TOKEN` creates workflow runs that wait on
approval, so the four required checks stay pending on the pushed commit until
someone with write access approves them from the pull request page. That
approval is the whole manual step, and it replaces the local checkout the job
used to require.

Dependabot treats a branch carrying someone else's commit as manually edited and
stops rebasing it on its own, so a bumped pull request that picks up a types
commit needs `@dependabot rebase` if it later falls behind `main`.

## Infrastructure

`terraform/` is a Terraform root holding the apex A record and the apex→www redirect
ruleset. The `bendrucker-me` HCP Terraform workspace applies it on merge to
`main`, so there is no local apply path. `terraform fmt`, `terraform validate`,
and `terraform init -backend=false` all work locally.

Its Cloudflare token covers Zone Read, DNS Write, and Dynamic URL Redirects
Write on the `bendrucker.me` zone. Account-scoped resources (Workers, R2, D1)
need a wider token, minted in
[bendrucker/infrastructure](https://github.com/bendrucker/infrastructure), which
also defines the workspace and holds the zone and its other records.
