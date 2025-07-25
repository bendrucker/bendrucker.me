import { defineConfig, envField } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName.js";
import { SITE } from "./src/config";

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  redirects: {
    "/blog/joining-eaze": "/posts/joining-eaze",
    "/blog/im-shutting-down-valet-io": "/posts/im-shutting-down-valet-io",
    "/blog/understanding-open-source-communities": "/posts/understanding-open-source-communities",
    "/blog/six-months-as-a-dropout": "/posts/six-months-as-a-dropout",
    "/blog/how-to-start-contributing-to-open-source": "/posts/how-to-start-contributing-to-open-source",
    "/blog/sucking-less-at-business-development": "/posts/sucking-less-at-business-development",
    "/blog/the-open-default-principle": "/posts/the-open-default-principle",
    "/blog/in-defense-of-knowing-less": "/posts/in-defense-of-knowing-less",
    "/blog/collaborating-asynchronously-to-get-more-done": "/posts/collaborating-asynchronously-to-get-more-done",
    "/blog/why-i-didnt-apply-to-ycombinator": "/posts/why-i-didnt-apply-to-ycombinator",
    "/blog/the-future-is-service-oriented": "/posts/the-future-is-service-oriented",
    "/blog/the-5-am-principle": "/posts/the-5-am-principle",
    "/blog/how-citi-bike-salvaged-a-botched-launch": "/posts/how-citi-bike-salvaged-a-botched-launch",
    "/blog/when-no-ones-looking": "/posts/when-no-ones-looking",
    "/blog/5-reasons-my-company-will-fail": "/posts/5-reasons-my-company-will-fail",
    "/blog/going-all-in": "/posts/going-all-in",
    "/blog/the-myth-of-the-costless-startup": "/posts/the-myth-of-the-costless-startup",
    "/blog/thinking-big-and-small": "/posts/thinking-big-and-small",
    "/blog/entrepreneur-interviews-greg-skloot": "/posts/entrepreneur-interviews-greg-skloot",
    "/blog/entrepreneur-interviews-dan-shipper": "/posts/entrepreneur-interviews-dan-shipper",
    "/blog/entrepreneur-interviews-jack-mcdermott": "/posts/entrepreneur-interviews-jack-mcdermott",
    "/blog/entrepreneurship-is-a-mindset": "/posts/entrepreneurship-is-a-mindset",
  },
  integrations: [
    sitemap({
      filter: page => SITE.showArchives || !page.endsWith("/archives"),
    }),
  ],
  markdown: {
    remarkPlugins: [remarkToc, [remarkCollapse, { test: "Table of contents" }]],
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
    // eslint-disable-next-line
    // @ts-ignore
    // This will be fixed in Astro 6 with Vite 7 support
    // See: https://github.com/withastro/astro/issues/14030
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
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
  experimental: {
    preserveScriptOrder: true,
  },
});