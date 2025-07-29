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

### Automatic Deployment
- **Trigger**: Push to `master` branch
- **Process**: GitHub Actions builds and deploys to Cloudflare Workers
- **URL**: Automatically available at www.bendrucker.me

### Manual Deployment
```bash
git push origin master  # Triggers GitHub Actions workflow
```

## 🎨 Styling & Assets

### CSS Architecture
- **Styling**: TailwindCSS with utility-first approach
- **Variables**: CSS custom properties for theming
- **Responsive**: Mobile-first breakpoints
- **Icons**: SVG icons in src/assets/icons/ and icomoon font icons

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
1. Edit TailwindCSS classes in components
2. Modify global styles in `src/styles/` directory
3. Static assets go in `static/` directory

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