# bendrucker.me

Personal website and blog built with [Astro](https://astro.build).

🌐 **Live Site**: [www.bendrucker.me](https://www.bendrucker.me)

## 🚀 Tech Stack

- **Framework**: Astro (static site generation)
- **Styling**: TailwindCSS
- **Content**: Markdown with frontmatter (content collections)
- **Image Generation**: Dynamic OG images and RSS feed
- **Deployment**: GitHub Actions → Cloudflare Workers

## 📁 Project Structure

```text
/
├── static/             # Source static assets (copied to public/ during build)
├── public/             # Build output directory for static assets
├── dist/               # Production build output
├── src/
│   ├── content/
│   │   └── blog/      # Blog posts (Markdown with content collections)
│   ├── layouts/       # Astro layout components
│   ├── pages/         # Routes (.astro files)
│   ├── components/    # Reusable Astro components
│   └── config.ts      # Site configuration
├── .github/workflows/ # GitHub Actions for deployment
└── package.json
```

- **Content Collections**: Blog posts managed through Astro's type-safe content collections
- **Static Assets**: Source files in `static/`, build output in `public/`
- **Components**: Reusable Astro components with proper TypeScript typing

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 🚧 Development

The site is built with modern web standards and includes:

- ✅ **SEO Optimized**: Meta tags, Open Graph, structured data
- ✅ **Performance**: Static generation with minimal JavaScript
- ✅ **TypeScript**: Type-safe configuration and components
- ✅ **Accessibility**: Semantic HTML and proper markup
- ✅ **Responsive**: Mobile-first design approach

## 🚀 Deployment

The site automatically deploys to Cloudflare Workers when changes are pushed to the master branch. The deployment process:

1. **Build**: Astro generates static files in `./dist/`
2. **Deploy**: GitHub Actions deploys to Cloudflare Workers
3. **Live**: Available at [www.bendrucker.me](https://www.bendrucker.me)

## 📝 Adding Content

Blog posts are written in Markdown with frontmatter:

```markdown
---
title: Your Post Title
subtitle: Optional subtitle
publishDate: 2024-01-01
categories: Technology, Programming
---

Your post content here...
```

## 🙏 Acknowledgments

This site is built on the [AstroPaper](https://github.com/satnaing/astro-paper) theme by [Sat Naing](https://github.com/satnaing). AstroPaper provided an excellent foundation with modern Astro features, TypeScript support, and a clean, performant design.

## 🔗 Links

- [Astro Documentation](https://docs.astro.build)
- [AstroPaper Theme](https://github.com/satnaing/astro-paper)
