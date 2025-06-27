import { Feed } from 'feed';
import { getCollection } from 'astro:content';
import { SITE } from '../config.js';

export async function GET() {
  // Get all blog posts and sort by publish date (newest first)
  const posts = await getCollection('blog');
  const sortedPosts = posts.sort(
    (a, b) => new Date(b.data.publishDate).valueOf() - new Date(a.data.publishDate).valueOf()
  );

  // Create the feed
  const feed = new Feed({
    title: SITE.title,
    description: SITE.description,
    id: SITE.url,
    link: SITE.url,
    language: 'en',
    image: `${SITE.url}/favicon.svg`,
    favicon: `${SITE.url}/favicon.ico`,
    copyright: `© ${new Date().getFullYear()} ${SITE.author}`,
    updated: sortedPosts.length > 0 ? new Date(sortedPosts[0].data.publishDate) : new Date(),
    feedLinks: {
      rss2: `${SITE.url}/feed.xml`,
    },
    author: {
      name: SITE.author,
      email: 'ben@bendrucker.me',
      link: SITE.url,
    },
  });

  // Add each post to the feed
  for (const post of sortedPosts) {
    const postUrl = `${SITE.url}/blog/${post.slug}`;
    
    feed.addItem({
      title: post.data.title,
      id: postUrl,
      link: postUrl,
      description: post.data.subtitle || post.data.title,
      content: `<p>${post.data.subtitle || ''}</p>`, // Basic content - could be enhanced with rendered content
      author: [{
        name: SITE.author,
        email: 'ben@bendrucker.me',
        link: SITE.url,
      }],
      date: new Date(post.data.publishDate),
      category: post.data.categories ? post.data.categories.split(',').map(cat => ({ name: cat.trim() })) : [],
    });
  }

  // Return the RSS XML
  return new Response(feed.rss2(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}