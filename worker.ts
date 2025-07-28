export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return await env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

interface Env {
  ASSETS: Fetcher;
}