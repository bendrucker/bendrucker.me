/// <reference types="astro/client" />

type ENV = {
  GITHUB_KV: KVNamespace;
  ASSETS: Fetcher;
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {}
}
