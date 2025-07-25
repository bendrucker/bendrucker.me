# bendrucker.me

Personal website and blog built with [Astro](https://astro.build).

🌐 **Live Site**: [www.bendrucker.me](https://www.bendrucker.me)

## 🚀 Tech Stack

- **Framework**: Astro (static site generation)
- **Styling**: TailwindCSS
- **Styling**: CSS (compiled from Stylus)
- **Content**: Markdown with frontmatter
- **Deployment**: GitHub Actions → GitHub Pages

## 📁 Project Structure

```text
/
├── public/              # Static assets (images, fonts, CSS)
├── src/
│   ├── content/
│   │   └── blog/       # Blog posts (Markdown)
│   ├── layouts/        # Astro layout components
│   ├── pages/          # Routes (.astro files)
│   └── config.ts       # Site configuration
├── .github/workflows/  # GitHub Actions for deployment
└── package.json
```

- **Content Collections**: Blog posts are managed through Astro's content collections
- **Layouts**: Reusable page layouts with proper SEO and meta tags
- **Static Assets**: Images, fonts, and compiled CSS in `public/`

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

The site automatically deploys to GitHub Pages when changes are pushed to the main branch. The deployment process:

1. **Build**: Astro generates static files in `./dist/`
2. **Deploy**: GitHub Actions uploads to GitHub Pages
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

## 🔗 Links

- [Astro Documentation](https://docs.astro.build)
- [Migration Documentation](./MIGRATION.md)
