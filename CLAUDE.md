# bendrucker.me

Personal website/blog: Astro → Cloudflare Workers. TailwindCSS v4, Alpine.js, npm workspaces (`packages/*`, `workers/*`).

## Structure

- `src/config.ts` — `SITE` constant (metadata, feature flags)
- `src/content/blog/*.md` — posts (frontmatter: `title`, `publishDate` required; `subtitle`, `categories`, `series` optional)
- `src/pages/` — routes: `posts/`, `activity/code.astro`, `tags/`, `archives/`, `about.md`, `rss.xml.ts`, `og.png.ts`
- `src/layouts/` — `Layout`, `PostDetails`, `AboutLayout`, `Main`
- `src/styles/global.css` — theme variables + Tailwind `@theme inline`
- `static/` — images, fonts (copied to `public/` at build)
- `packages/logger` — shared pino logger; `packages/github` — GitHub API client
- `workers/github` — cron (hourly): GitHub API → KV
- `workers/strava` — cron (6h): Strava API → KV

## Commands

```bash
npm run dev           # Spotlight + Astro dev server
npm run build         # packages → wrangler types → astro check → astro build
npm run lint          # ESLint
npm run format        # Prettier
```

## Stop Hook

`.claude/hooks/verify.sh` runs on turns touching `.js`/`.ts`/`.astro`/`.mjs`: formats with Prettier, lints, builds (cached). Exit 2 blocks Claude until fixed.

## Theme

CSS vars in `global.css` → Tailwind: `bg-background`, `text-foreground`, `bg-accent`, `text-accent`, `bg-muted`, `text-muted`, `border-border`. Dark mode via `data-theme="dark"` / `dark:` prefix. No `skin-*` classes.

## Workers

All deploy via GitHub Actions matrix on push to `main`. Use `@workspace/logger` for logging.

| Worker | Config | Purpose |
|--------|--------|---------|
| www | `wrangler.toml` | Main site, reads KV |
| github | `workers/github/wrangler.toml` | GitHub activity → KV |
| strava | `workers/strava/wrangler.toml` | Strava activity → KV |

Run `npx wrangler types` after changing any `wrangler.toml`.
