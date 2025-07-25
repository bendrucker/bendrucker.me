import type { APIContext, MiddlewareNext } from "astro";

export const onRequest = async (context: APIContext, next: MiddlewareNext) => {
  const url = new URL(context.url);
  
  // Redirect /blog/* to /posts/* with 301 permanent redirect
  if (url.pathname.startsWith('/blog/')) {
    const newPath = url.pathname.replace('/blog/', '/posts/');
    return context.redirect(newPath, 301);
  }
  
  return next();
};