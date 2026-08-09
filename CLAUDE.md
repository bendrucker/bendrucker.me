# bendrucker.me

Personal website/blog: Astro → Cloudflare Workers. TailwindCSS v4, Vue, npm workspaces (`packages/*`, `workers/*`).

## Structure

- `src/config.ts` — `SITE` constant (metadata, feature flags)
- `src/content/blog/*.md` — posts (frontmatter: `title`, `publishDate` required; `subtitle`, `categories`, `series` optional)
- `src/pages/` — routes: `posts/`, `activity/code.astro`, `tags/`, `archives/`, `about.md`, `rss.xml.ts`, `og.png.ts`
- `src/layouts/` — `Layout`, `PostDetails`, `AboutLayout`, `Main`
- `src/styles/global.css` — theme variables + Tailwind `@theme inline`
- `static/` — images, fonts (copied to `public/` at build)
- `packages/logger` — shared pino logger; `packages/github` — GitHub API client
- `workers/github` — cron (hourly): GitHub API → D1
- `workers/strava` — cron (6h): Strava API → KV

## Commands

```bash
npm run dev           # Spotlight + Astro dev server
npm run dev:json      # Astro dev server with JSON logs (no Spotlight)
npm run build         # packages → wrangler types → astro check → astro build
npm run lint          # ESLint
npm run format        # Prettier
npm run story:dev     # Histoire component stories on :6006
npm run story:build   # Static story book into .histoire/dist
```

### Component Stories

Vue components are developed against Histoire (`*.story.vue`, colocated with the
component). `histoire.config.ts` restates the parts of `astro.config.ts` that
Histoire's own Vite server needs: `@vitejs/plugin-vue` for the SFC compiler,
Tailwind, and the `@` alias. `src/histoire.setup.ts` imports `global.css` and
mirrors Histoire's dark-mode class onto `data-theme`, so stories render in the
site's real light and dark palettes.

Every pull request deploys the story book to a Cloudflare preview alias and
comments the link, so a component can be reviewed from a phone with nothing
checked out. `workers/stories/wrangler.toml` serves `.histoire/dist` with a
single-page-application fallback, since a story deep link has no HTML of its own.

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

`.claude/hooks/verify.sh` runs on turns touching `.js`/`.ts`/`.astro`/`.mjs`: formats with Prettier, lints, builds (cached). Exit 2 blocks Claude until fixed.

## Theme

CSS vars in `global.css` → Tailwind: `bg-background`, `text-foreground`, `bg-accent`, `text-accent`, `bg-muted`, `text-muted`, `border-border`. Dark mode via `data-theme="dark"` / `dark:` prefix. No `skin-*` classes.

## Workers

All deploy via GitHub Actions matrix on push to `main`. Use `@workspace/logger` for logging.

| Worker | Config                         | Purpose              |
| ------ | ------------------------------ | -------------------- |
| www    | `wrangler.toml`                | Main site, reads D1  |
| github | `workers/github/wrangler.toml` | GitHub activity → D1 |
| strava | `workers/strava/wrangler.toml` | Strava activity → KV |

Run `npx wrangler types` after changing any `wrangler.toml`.
