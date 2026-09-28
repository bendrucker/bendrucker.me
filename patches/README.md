# Dependency Patches

`patch-package` applies the `.patch` files here on every `npm install`, through the root `postinstall`. Both exist to cut the time from saving a file to the browser showing it under `astro dev`, which runs the server in workerd through `@cloudflare/vite-plugin`. Neither changes the build or production.

Times are medians from an interleaved benchmark of four edit kinds against the unpatched tree.

| Edit     | Before | After                    |
| -------- | ------ | ------------------------ |
| `.astro` | 507ms  | 259ms                    |
| `.css`   | 115ms  | 32ms                     |
| `.md`    | 759ms  | 310ms                    |
| `.vue`   | 88ms   | 138ms (inside the noise) |

## `@cloudflare/vite-plugin`

On a server reload, the plugin's module runner cleared every module it had evaluated and re-imported them all: 437 for the homepage, 170 of them prebundled dependencies that cannot have changed. The patch invalidates only the modules of the file named in the reload and the modules that import them, about 20 for a component edit. A reload that names no file still clears everything.

This took an `.astro` save from about 490ms to 290ms. The handler comes from Vite's own module runner, which the plugin bundles, so the fix belongs upstream in Vite. Drop the patch once a plugin release carries it.

## `astro`

Two changes, both in the content layer:

- The data store is written 50ms after a content change instead of 500ms. The browser reload waits on that write. A build waits on the save promise and is unaffected. In dev, each write re-serializes the whole store, so a burst of changes spaced more than 50ms apart, like a branch switch, now writes it several times where 500ms coalesced them into one.
- When the data store or asset imports change, Astro sends a server environment that Vite cannot run in-process (workerd) a reload naming the changed module. Unpatched, Astro refreshes those modules only in an in-process environment. workerd picked up new content only because Tailwind's scan of the posts sent a reload that cleared every module.

`src/styles/global.css` keeps `src/content` out of Tailwind's scan, which stops that clear-everything reload on every post save. Posts don't use utility classes, and the production CSS is byte-identical with and without the exclusion. Together these took a `.md` save from about 780ms to 310ms.

## Maintenance

A dependency bump that moves the patched code fails `npm install`. Regenerate the patch against the new version with `npx patch-package <package>` or delete it. The plugin is nested under the adapter, so its name is `@astrojs/cloudflare/@cloudflare/vite-plugin`.

`patch-package` cannot apply an edited patch over the previous version of it, and a new worktree starts from its base's patched `node_modules`. After a patch changes, reinstall that package wherever the old one was applied:

```bash
rm -rf node_modules/<package> && npm install
```
