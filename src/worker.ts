// The Worker entry, replacing the adapter's own default so a named entrypoint
// can sit alongside the Astro server. The Cloudflare Vite plugin re-exports
// everything this module exports, so `Publish` becomes callable over a service
// binding while HTTP still reaches only the default export's fetch.
import astro from "@astrojs/cloudflare/entrypoints/server";
import { routablePhotoRequest } from "./photos";

export { Publish } from "./publish";

export default {
  async fetch(request, env, context) {
    return astro.fetch(routablePhotoRequest(request), env, context);
  },
} satisfies ExportedHandler<Env>;
