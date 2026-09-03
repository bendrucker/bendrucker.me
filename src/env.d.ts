/// <reference types="astro/client" />

// Public because the route maps build tile URLs in the browser. CARTO scopes
// the key to the domains it was issued for, which is what stands in for
// secrecy.
interface ImportMetaEnv {
  readonly PUBLIC_CARTO_BASEMAP_KEY?: string;
}

type ENV = {
  ASSETS: Fetcher;
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

declare namespace App {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Locals extends Runtime {}
}
