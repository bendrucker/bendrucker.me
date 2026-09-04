/// <reference types="astro/client" />

// Secrets are declared here rather than in worker-configuration.d.ts, which
// `wrangler types` regenerates from the bindings alone.
declare namespace Cloudflare {
  interface Env {
    /**
     * Optional: CARTO's vector basemaps serve unkeyed today. The key is what
     * keeps them serving once the requirement reaches vector, as it already
     * has on the raster tiles this replaced.
     */
    CARTO_BASEMAP_KEY?: string;
  }
}

type ENV = {
  ASSETS: Fetcher;
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

declare namespace App {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Locals extends Runtime {}
}
