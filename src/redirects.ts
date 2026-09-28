/**
 * The old addresses that moved to a route of their own, as `astro.config.ts`
 * hands them to Astro. Each is a 301 the adapter writes into `_redirects`.
 *
 * Three kinds of move can't be written here. A dynamic redirect to a page
 * route resolves to that page's `index.html`, so `/activity/code/<year>`
 * answers from its own endpoint. The adapter writes a dynamic redirect with a
 * literal `*` in its destination, which Cloudflare discards, so `/posts/*`
 * lives in `static/_redirects` with `:splat`. `/tags/<tag>` carries its tag
 * into a query string, which neither can write, so
 * `src/middleware/redirects.ts` answers it.
 */
export const STATIC_REDIRECTS = {
  "/activity/cycling": "/rides",
  "/activity/code": "/code",
  "/posts": "/writing",
  "/archives": "/writing",
} as const satisfies Record<string, string>;
