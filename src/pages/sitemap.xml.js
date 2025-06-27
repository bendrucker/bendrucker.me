import { getCollection } from 'astro:content';
import { SITE } from '../config.js';

/**
 * Sitemap URL entry interface
 * @typedef {Object} SitemapUrl
 * @property {string} loc - The URL location
 * @property {string} lastmod - Last modification date in ISO format  
 * @property {string} changefreq - How frequently the page changes
 * @property {string} priority - Priority relative to other URLs (0.0 to 1.0)
 */

/**
 * Sitemap data structure
 * @typedef {Object} Sitemap
 * @property {SitemapUrl[]} urls - Array of URL entries
 */

/**
 * Escape XML characters in text content
 * @param {string} text 
 * @returns {string}
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Convert sitemap object to XML string
 * @param {Sitemap} sitemap 
 * @returns {string}
 */
function renderSitemapXml(sitemap) {
  const urls = sitemap.urls.map(url => {
    return `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${escapeXml(url.lastmod)}</lastmod>
    <changefreq>${escapeXml(url.changefreq)}</changefreq>
    <priority>${escapeXml(url.priority)}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export async function GET() {
  // Get all blog posts and sort by publish date (newest first)
  const posts = await getCollection('blog');
  const sortedPosts = posts.sort(
    (a, b) => new Date(b.data.publishDate).valueOf() - new Date(a.data.publishDate).valueOf()
  );

  // Create sitemap data structure using typed objects
  /** @type {Sitemap} */
  const sitemap = {
    urls: []
  };

  // Add homepage
  sitemap.urls.push({
    loc: SITE.url,
    lastmod: sortedPosts.length > 0 
      ? new Date(sortedPosts[0].data.publishDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    changefreq: 'weekly',
    priority: '1.0'
  });

  // Add each blog post
  for (const post of sortedPosts) {
    const postUrl = `${SITE.url}/blog/${post.slug}`;
    
    sitemap.urls.push({
      loc: postUrl,
      lastmod: new Date(post.data.publishDate).toISOString().split('T')[0],
      changefreq: 'monthly', 
      priority: '0.8'
    });
  }

  // Render sitemap to XML using typed objects
  const xmlContent = renderSitemapXml(sitemap);

  return new Response(xmlContent, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}