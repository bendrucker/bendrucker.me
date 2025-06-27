import { getCollection } from 'astro:content';
import { SITE } from '../config.ts';

export async function GET() {
  const posts = await getCollection('blog');
  const sortedPosts = posts.sort((a, b) => 
    new Date(b.data.publishDate).getTime() - new Date(a.data.publishDate).getTime()
  );

  const rssItems = sortedPosts.map((post) => {
    const pubDate = new Date(post.data.publishDate).toUTCString();
    const postUrl = `${SITE.url}/blog/${post.slug}/`;
    
    return `
    <item>
      <title><![CDATA[${post.data.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${post.data.subtitle || post.data.title}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${SITE.author}</author>
      ${post.data.categories ? `<category>${post.data.categories}</category>` : ''}
    </item>`.trim();
  }).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE.title}</title>
    <description>${SITE.description}</description>
    <link>${SITE.url}</link>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <managingEditor>${SITE.author}</managingEditor>
    <webMaster>${SITE.author}</webMaster>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>1440</ttl>
${rssItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}