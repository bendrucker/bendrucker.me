/// <reference types="astro/client" />

type ENV = {
  GITHUB_KV: KVNamespace;
  ASSETS: Fetcher;
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

declare namespace App {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Locals extends Runtime {}
}
