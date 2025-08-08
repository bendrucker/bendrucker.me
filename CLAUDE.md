# Claude Project Documentation

This is a personal website and blog built with modern web technologies, migrated from a 10-year-old Wintersmith setup to Astro.

## 🏗️ Architecture Overview

### Tech Stack

- **Framework**: [Astro](https://astro.build) - Static site generator with component-based architecture
- **Styling**: [TailwindCSS](https://tailwindcss.com) - Utility-first CSS framework
- **Styling**: CSS (compiled from original Stylus) with modern web standards
- **Content**: Markdown files with frontmatter, managed through Astro content collections
- **Deployment**: GitHub Actions → Cloudflare Workers
- **Domain**: www.bendrucker.me

### Key Design Principles

1. **Performance First**: Static generation with minimal JavaScript
2. **SEO Optimized**: Modern meta tags, structured data, social media cards
3. **Type Safe**: TypeScript throughout with strict configuration
4. **Maintainable**: Centralized configuration, consistent patterns
5. **Accessible**: Semantic HTML, proper markup structure
6. **Structured Logging**: Use `@workspace/logger` for all logging in workers and packages

## 📁 Project Structure

```
/
├── .github/workflows/     # GitHub Actions (deploy.yml, claude.yml)
├── static/               # Source static assets (copied to public/ during build)
│   ├── images/          # Blog images and site assets
│   ├── fonts/           # Icon fonts (icomoon)
│   ├── assets/          # Theme assets
│   └── favicon.*        # Site icons
├── public/               # Build output directory (auto-generated, not in git)
├── src/
│   ├── config.ts        # Centralized site configuration
│   ├── content/
│   │   ├── config.ts    # Content collections schema
│   │   └── blog/        # Blog posts (22 migrated posts)
│   ├── layouts/
│   │   ├── BaseLayout.astro    # Main site layout with SEO
│   │   └── BlogPost.astro      # Blog post layout with structured data
│   └── pages/
│       ├── index.astro         # Home page with post listing
│       └── blog/[...slug].astro # Dynamic blog post routes
├── astro.config.ts      # Astro configuration
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## 🎯 Key Components

### Site Configuration (`src/config.ts`)

Centralized configuration object with:

- Site metadata (name, description, URLs)
- Social media links
- Author information
- Used throughout layouts for consistency

### Content Collections (`content/`)

- **Blog posts**: Type-safe markdown with frontmatter schema
- **Schema validation**: Zod-based validation for post metadata
- **Asset management**: Images stored in content/blog/assets/

### Layouts

- **BaseLayout**: Main template with SEO, Open Graph, Twitter Cards
- **BlogPost**: Specialized layout with JSON-LD structured data
- **Responsive**: Mobile-first design approach

### Styling Approach

- **CSS**: Compiled from original Stylus (preserved design)
- **Modern standards**: HTTPS everywhere, semantic HTML
- **Performance**: Optimized loading, minimal CSS

## 🔧 Development Workflow

### Commands

```bash
npm run dev           # Development server (localhost:4321)
npm run build         # Production build
npm run preview       # Preview built site
npm run fetch-activity # Fetch GitHub activity data for local development
npx wrangler types    # Generate TypeScript types after wrangler.toml changes
```

**Important**: After updating `wrangler.toml`, always run `npx wrangler types` to regenerate TypeScript definitions.

### Testing Cron Triggers Locally

The GitHub worker includes scheduled functions that can be tested in preview mode without affecting production:

1. **Start the GitHub worker in development mode with scheduled event testing enabled**:

   ```bash
   cd workers/github
   npx wrangler dev --test-scheduled
   ```

2. **Trigger the scheduled function manually**:

   ```bash
   curl "http://localhost:8787/__scheduled?cron=0+*/6+*+*+*"
   ```

   This simulates the cron trigger that runs every 6 hours in production.

3. **Verify the results**:
   - Check console output for successful GitHub API fetch and KV storage
   - The worker logs will show repository count and execution time
   - Data is stored in the preview KV namespace (`preview_id` in `wrangler.toml`)
   - Test the `/activity` endpoint: `curl http://localhost:8787/activity`

**Note**: This testing approach uses the preview KV namespace, ensuring production data remains untouched during development and testing.

### Content Management

- **Adding posts**: Create `.md` files in `content/blog/`
- **Frontmatter format**:
  ```yaml
  ---
  title: Post Title
  subtitle: Optional subtitle
  publishDate: 2024-01-01
  categories: Technology, Programming
  ---
  ```
- **Images**: Place in `static/images/` and reference as `/images/filename` (copied to public/ during build)

### Code Standards

- **TypeScript**: Strict mode enabled, proper interfaces
- **Components**: Astro components with type-safe props
- **Imports**: Use absolute imports from `src/`
- **Config**: Import from `src/config.ts` for consistency

## 🔄 Theme Updates

This site is built on the [AstroPaper](https://github.com/satnaing/astro-paper) theme. Since Astro themes are template repositories (not packages), updates require manual integration.

### Upstream Remote Setup

```bash
git remote add upstream https://github.com/satnaing/astro-paper.git
```

### Getting Updates from Upstream

1. **Fetch upstream changes**:

   ```bash
   git fetch upstream
   ```

2. **Review changes**:

   ```bash
   git log HEAD..upstream/main --oneline
   git diff HEAD..upstream/main
   ```

3. **Merge selective changes**:

   ```bash
   # Cherry-pick specific commits
   git cherry-pick <commit-hash>

   # Or create merge commit
   git merge upstream/main
   ```

4. **Resolve conflicts**: Manually merge conflicts, prioritizing local customizations
5. **Test thoroughly**: Run `npm run dev` and `npm run build` to ensure compatibility
6. **Update dependencies**: Check if theme updates require package.json changes

### Customization Strategy

- **Preserve**: Local content in `content/`, custom config in `src/config.ts`
- **Review carefully**: Changes to layouts, components, and styling
- **Document**: Track significant customizations for future reference

## 🚀 Deployment

### Multi-Worker Architecture

This project uses a **multi-worker setup** on Cloudflare:

1. **Main Site Worker** (`wrangler.toml`)
   - Serves the static site at www.bendrucker.me
   - Reads activity data from KV storage
   - Deployed from project root

2. **GitHub Activity Worker** (`workers/github/wrangler.toml`)
   - Background data fetching for GitHub activity
   - Runs cron job every hour (`0 * * * *`)
   - Fetches GitHub API data and stores in KV namespace
   - Deployed from `workers/github/` directory

3. **Strava Activity Worker** (`workers/strava/wrangler.toml`)
   - Background data fetching for Strava activity
   - Runs cron job every 6 hours (`0 */6 * * *`)
   - OAuth2 flow with user validation (athlete ID: 5723594)
   - Fetches Strava API data and stores in KV namespace
   - Deployed from `workers/strava/` directory
   - **Note**: Strava doesn't support PKCE in their OAuth implementation as of 2024

### KV Storage Configuration

Both workers share the same KV namespace for GitHub data:

- **Production**: `fa47de77b5c94c938cc68c94c6a247a9` (binding: `GITHUB_KV`)
- **Preview**: `e8f3338afa2645669d60e88f16876007` (binding: `GITHUB_KV`)

Future platforms will have dedicated KV namespaces (e.g., `STRAVA_KV`, `LINKEDIN_KV`)

### Automatic Deployment

- **Trigger**: Push to `master` branch
- **Process**: GitHub Actions builds and deploys both workers
- **Main Site**: www.bendrucker.me
- **GitHub Worker**: github.bvdrucker.workers.dev (background only)

### Manual Deployment

```bash
# Deploy main site
npm run build && npx wrangler deploy

# Deploy GitHub activity worker
npx wrangler deploy --config workers/github/wrangler.toml

# Deploy Strava activity worker
npx wrangler deploy --config workers/strava/wrangler.toml
```

## 🎨 Styling & Assets

### CSS Architecture

- **Styling**: TailwindCSS with utility-first approach
- **Variables**: CSS custom properties for theming
- **Responsive**: Mobile-first breakpoints
- **Icons**: SVG icons in src/assets/icons/ and icomoon font icons

### Theme System

This project uses a custom CSS theme system defined in `src/styles/global.css`. **Important**: Do NOT use `skin-*` classes - they don't exist in this project.

#### Available Theme Colors

- `--background`: Main background color
- `--foreground`: Primary text color
- `--accent`: Accent/brand color (blue in light, orange in dark)
- `--muted`: Secondary/muted content color
- `--border`: Border and divider color

#### Tailwind Integration

Theme colors are exposed as Tailwind utility classes through the `@theme inline` configuration:

**✅ CORRECT Usage:**

```css
bg-background     /* Background color */
text-foreground   /* Primary text */
bg-accent         /* Accent background */
text-accent       /* Accent text */
bg-muted          /* Muted background */
text-muted        /* Muted text */
border-border     /* Border color */
```

**❌ INCORRECT Usage:**

```css
bg-skin-accent    /* Does NOT exist */
text-skin-base    /* Does NOT exist */
bg-skin-fill      /* Does NOT exist */
```

#### Dark Mode Support

- Light mode: Default theme colors
- Dark mode: Activated via `data-theme="dark"` attribute
- Custom variant: `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))`
- Use standard TailwindCSS `dark:` prefix for dark mode variants

### Asset Organization

- **Images**: `static/images/` for site assets (copied to public/ during build)
- **Fonts**: `static/fonts/` for icon fonts (copied to public/ during build)
- **Blog assets**: Can be in `static/images/` or content collections
- **Build output**: `public/` directory is auto-generated and excluded from git

## 🔮 Future Enhancements

### Dynamic Features

Ready for future interactivity with vanilla JavaScript or modern web APIs.

### Planned Features (GitHub Issues)

- RSS feed generation (#13)
- Google Analytics 4 migration (#14)
- Sitemap generation (#15)
- Dependabot configuration (#16)

### Dynamic Content Ideas

- Strava activity integration
- GitHub activity/contributions widget
- Contact form
- Newsletter signup
- Reading time estimates
- Related posts

## 🐛 Common Tasks

### Adding a New Blog Post

1. Create `content/blog/post-slug.md`
2. Add frontmatter with required fields
3. Write content in Markdown
4. Add images to `static/images/` if needed
5. Test with `npm run dev`

### Updating Site Configuration

1. Edit `src/config.ts`
2. Changes automatically apply to all layouts
3. Rebuild to see changes

### Styling Changes

1. **TailwindCSS classes**: Use project-specific theme classes (`bg-background`, `text-foreground`, `bg-accent`, `text-muted`, `border-border`)
2. **Global styles**: Modify `src/styles/global.css` for theme variables and base styles
3. **Static assets**: Place in `static/` directory (copied to public/ during build)
4. **Theme consistency**: Always check existing components for established patterns before adding new styles

### SEO Improvements

- Meta tags: Edit `BaseLayout.astro`
- Structured data: Edit `BlogPost.astro`
- Open Graph: Configured in BaseLayout

## 🔍 Technical Details

### Performance Characteristics

- **Static HTML**: Pre-rendered at build time
- **Minimal JS**: Vanilla JavaScript for essential interactivity
- **CSS**: Single file, optimized loading
- **Images**: Served from CDN (Cloudflare Workers)

### SEO Features

- **Meta tags**: Complete Open Graph and Twitter Cards
- **Structured data**: JSON-LD for blog posts
- **Canonical URLs**: Prevent duplicate content
- **Sitemap**: Ready for implementation
- **Performance**: Fast loading, mobile-friendly

### Browser Support

- **Modern browsers**: ES2022+ features
- **Fallbacks**: ICO favicon for older browsers
- **Progressive enhancement**: Works without JavaScript

## 📝 Content Guidelines

### Writing Style

- **Tone**: Personal, technical, honest
- **Length**: Varies (existing posts range from 500-2000 words)
- **Topics**: Programming, entrepreneurship, productivity, personal insights

### Image Guidelines

- **Format**: PNG/JPG for photos, SVG for icons
- **Optimization**: Compress images before adding
- **Alt text**: Always include descriptive alt text
- **Responsive**: Consider different screen sizes

### Frontmatter Standards

```yaml
---
title: Clear, descriptive title
subtitle: Optional explanatory subtitle
publishDate: YYYY-MM-DD (required)
categories: Comma, Separated, List (optional)
series: Series Name (optional)
---
```

This architecture provides a solid foundation for continued development while maintaining the site's performance, SEO, and maintainability characteristics.
