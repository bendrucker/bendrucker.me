import { defineConfig, envField, logHandlers } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";
import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import { unified } from "@astrojs/markdown-remark";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/shiki/fileName";
import { isEnabled, isSwitchedOff, SITE, type CategoryEnv } from "./src/config";
import { writingSitemapPages } from "./src/writing/sitemap";
import { STATIC_REDIRECTS } from "./src/redirects";
import { copyStaticAssets } from "./src/staticAssets";
import { offCategoryIslands } from "./src/offCategoryIslands";

const DEPLOY_SCOPED_CACHE = { maxAge: 3600, swr: 86400 };

// Routes that render `noindex` while their data is still fixtures, so the
// sitemap leaves them out too.
const UNLISTED_ROUTES = new Set(["/reading", "/watching", "/listening"]);

const categoryEnv = {
  PUBLIC_ALL_CATEGORIES: process.env.PUBLIC_ALL_CATEGORIES,
};

// The dev server shows every category, so it keeps every fixture. Vite names
// the command only once a plugin's `config` hook runs.
let staticEnv: CategoryEnv = categoryEnv;

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  output: "server",
  // One URL per page: Astro otherwise serves `/about` and `/about/` as two
  // pages that each claim to be canonical. The slash is the direction that
  // works, because Cloudflare redirects the bare path to the
  // `<slug>/index.html` that `build.format: "directory"` writes.
  trailingSlash: SITE.trailingSlash,
  // Interactive runs stay human-readable. `npm run dev:json` opts into
  // machine-readable logs for tools that parse them.
  ...(process.env.ASTRO_LOG_JSON ? { logger: logHandlers.json() } : {}),
  adapter: cloudflare({
    imageService: "compile",
    // Each dev server claims a debugger port by checking 9229 and binding it
    // later, so two worktrees starting at once both pick it and one crashes.
    inspectorPort: false,
  }),
  cache: {
    provider: cacheCloudflare(),
  },
  redirects: STATIC_REDIRECTS,
  // On-demand routes that only change on deploy. `/`, `/rides`, and `/code` are
  // absent because their max-age is aligned to the hourly GitHub sync and
  // computed per request in src/middleware.ts. Prerendered routes are not
  // cached at runtime.
  routeRules: {
    "/about": DEPLOY_SCOPED_CACHE,
    "/about.md": DEPLOY_SCOPED_CACHE,
    "/writing": DEPLOY_SCOPED_CACHE,
    "/writing/[...slug]": DEPLOY_SCOPED_CACHE,
    "/writing/[...slug].md": DEPLOY_SCOPED_CACHE,
    "/og.png": DEPLOY_SCOPED_CACHE,
    "/llms.txt": DEPLOY_SCOPED_CACHE,
  },
  integrations: [
    sitemap({
      customPages: isEnabled("writing", categoryEnv)
        ? writingSitemapPages(SITE.website)
        : [],
      filter: (page) => {
        const { pathname } = new URL(page);
        return (
          !isSwitchedOff(pathname, categoryEnv) &&
          !UNLISTED_ROUTES.has(pathname.replace(/\/$/, ""))
        );
      },
    }),
    vue(),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkToc,
        [remarkCollapse, { test: "Table of contents" }],
      ],
    }),
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
      {
        name: "copy-static-files",
        config(_, { command }) {
          staticEnv = { ...categoryEnv, DEV: command === "serve" };
        },
        buildStart: () => copyStaticAssets("static", "public", staticEnv),
      },
      offCategoryIslands(() => staticEnv),
    ],
    ssr: {
      external: ["node:fs", "node:path"],
    },
    // reka-ui's dist lands in the SSR dep cache carrying its own copy of Vue
    // while the @astrojs/vue renderer resolves Vue from source. Across two
    // module instances the `currentRenderingInstance` that `renderSlot`
    // dereferences is null, so any reka component throws and the dev response
    // truncates mid-page. Excluding both puts them on one instance. Only
    // `astro dev` prebundles, so the build and `wrangler dev` are unaffected.
    //
    // Islands wrapping reka still server-render empty under `astro dev`: it
    // compiles them with SSR-optimized slots that reka's vdom-only dist
    // cannot accept, and Vue's dev-only guard in `renderSlot` swaps in an
    // empty slot. They hydrate normally, and the build renders them in full.
    environments: {
      ssr: {
        optimizeDeps: {
          exclude: [
            "reka-ui",
            "vue",
            "@vue/runtime-core",
            "@vue/runtime-dom",
            "@vue/reactivity",
            "@vue/shared",
            "@vue/server-renderer",
          ],
        },
      },
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
});
