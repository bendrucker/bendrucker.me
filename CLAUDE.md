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
```

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
