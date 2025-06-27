import { SITE } from '../config.js';

export async function GET() {
  const robots = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${SITE.url}/sitemap.xml

# RSS Feed
# ${SITE.url}/feed.xml`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}