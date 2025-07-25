# Claude Project Documentation

This is a personal website and blog built with modern web technologies, migrated from a 10-year-old Wintersmith setup to Astro.

## 🏗️ Architecture Overview

### Tech Stack
- **Framework**: [Astro](https://astro.build) - Static site generator with component-based architecture
- **Styling**: [TailwindCSS](https://tailwindcss.com) - Utility-first CSS framework
- **Styling**: CSS (compiled from original Stylus) with modern web standards
- **Content**: Markdown files with frontmatter, managed through Astro content collections
- **Deployment**: GitHub Actions → GitHub Pages
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
├── public/               # Static assets served directly
│   ├── css/main.css     # Compiled stylesheet from Stylus
│   ├── images/          # Blog images and site assets
│   ├── fonts/           # Icon fonts (icomoon)
│   └── favicon.*        # Site icons
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

### Content Collections (`src/content/`)
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
npm run dev      # Development server (localhost:4321)
npm run build    # Production build
npm run preview  # Preview built site
```

### Content Management
- **Adding posts**: Create `.md` files in `src/content/blog/`
- **Frontmatter format**:
  ```yaml
  ---
  title: Post Title
  subtitle: Optional subtitle
  publishDate: 2024-01-01
  categories: Technology, Programming
  ---
  ```
- **Images**: Place in `public/images/` and reference as `/images/filename`

### Code Standards
- **TypeScript**: Strict mode enabled, proper interfaces
- **Components**: Astro components with type-safe props
- **Imports**: Use absolute imports from `src/`
- **Config**: Import from `src/config.ts` for consistency

## 🚀 Deployment

### Automatic Deployment
- **Trigger**: Push to `master` branch
- **Process**: GitHub Actions builds and deploys to GitHub Pages
- **URL**: Automatically available at www.bendrucker.me

### Manual Deployment
```bash
git push origin master  # Triggers GitHub Actions workflow
```

## 🎨 Styling & Assets

### CSS Architecture
- **Single file**: `public/css/main.css` (compiled from Stylus)
- **Variables**: CSS custom properties for theming
- **Responsive**: Mobile-first breakpoints
- **Icons**: Icomoon font icons

### Asset Organization
- **Images**: `public/images/` for site assets
- **Fonts**: `public/fonts/` for icon fonts
- **Blog assets**: Can be in `public/images/` or content collections

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
1. Create `src/content/blog/post-slug.md`
2. Add frontmatter with required fields
3. Write content in Markdown
4. Add images to `public/images/` if needed
5. Test with `npm run dev`

### Updating Site Configuration
1. Edit `src/config.ts`
2. Changes automatically apply to all layouts
3. Rebuild to see changes

### Styling Changes
1. Edit `public/css/main.css` directly
2. Or modify original Stylus and recompile (scripts preserved in issue #16)

### SEO Improvements
- Meta tags: Edit `BaseLayout.astro`
- Structured data: Edit `BlogPost.astro`
- Open Graph: Configured in BaseLayout

## 🔍 Technical Details

### Performance Characteristics
- **Static HTML**: Pre-rendered at build time
- **Minimal JS**: Vanilla JavaScript for essential interactivity
- **CSS**: Single file, optimized loading
- **Images**: Served from CDN (GitHub Pages)

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