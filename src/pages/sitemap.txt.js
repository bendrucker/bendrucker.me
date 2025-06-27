import { getCollection } from 'astro:content';
import { SITE } from '../config.js';

export async function GET() {
  // Get all blog posts and sort by publish date (newest first)
  const posts = await getCollection('blog');
  const sortedPosts = posts.sort(
    (a, b) => new Date(b.data.publishDate).valueOf() - new Date(a.data.publishDate).valueOf()
  );

  // Create list of all URLs
  const urls = [
    SITE.url, // Home page
    `${SITE.url}/feed.xml`, // RSS feed
  ];

  // Add blog post URLs
  for (const post of sortedPosts) {
    urls.push(`${SITE.url}/blog/${post.slug}`);
  }

  // Return plain text sitemap
  return new Response(urls.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}