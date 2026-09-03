import { defineConfig, envField, logHandlers } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import sentry from "@sentry/astro";
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
import { SITE } from "./src/config";
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const isDev = process.env.NODE_ENV === "development";

const DEPLOY_SCOPED_CACHE = { maxAge: 3600, swr: 86400 };

function copyStaticFiles(src: string, dest: string) {
  try {
    mkdirSync(dest, { recursive: true });
    for (const item of readdirSync(src)) {
      const srcPath = join(src, item);
      const destPath = join(dest, item);

      if (statSync(srcPath).isDirectory()) {
        copyStaticFiles(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  } catch {
    // Ignore if static directory doesn't exist
  }
}

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  output: "server",
  // Interactive runs stay human-readable. `npm run dev:json` opts into
  // machine-readable logs for tools that parse them.
  ...(process.env.ASTRO_LOG_JSON ? { logger: logHandlers.json() } : {}),
  adapter: cloudflare({
    imageService: "compile",
  }),
  cache: {
    provider: cacheCloudflare(),
  },
  // On-demand routes that only change on deploy. `/activity` is absent because
  // its max-age is aligned to the hourly GitHub sync and computed per request
  // in src/middleware.ts. Prerendered routes are not cached at runtime.
  routeRules: {
    "/": DEPLOY_SCOPED_CACHE,
    "/about": DEPLOY_SCOPED_CACHE,
    "/about.md": DEPLOY_SCOPED_CACHE,
    "/posts/[...slug]": DEPLOY_SCOPED_CACHE,
    "/posts/[...slug].md": DEPLOY_SCOPED_CACHE,
    "/og.png": DEPLOY_SCOPED_CACHE,
    "/llms.txt": DEPLOY_SCOPED_CACHE,
  },
  integrations: [
    sitemap({
      filter: (page) => SITE.showArchives || !page.endsWith("/archives"),
    }),
    vue(),
    ...(isDev
      ? [
          sentry({
            sourceMapsUploadOptions: { enabled: false },
            autoInstrumentation: { requestHandler: false },
          }),
        ]
      : []),
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
        buildStart: () => copyStaticFiles("static", "public"),
      },
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
