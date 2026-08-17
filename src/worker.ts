// The Worker entry, replacing the adapter's own default so a named entrypoint
// can sit alongside the Astro server. The Cloudflare Vite plugin re-exports
// everything this module exports, so `Publish` becomes callable over a service
// binding while HTTP still reaches only the default export's fetch.
export { default } from "@astrojs/cloudflare/entrypoints/server";
export { Publish } from "./publish";
