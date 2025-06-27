import { SITE } from '../config.js';

export async function GET() {
  const robotsContent = `User-agent: *
Allow: /

Sitemap: ${SITE.url}/sitemap.xml`;

  return new Response(robotsContent, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}