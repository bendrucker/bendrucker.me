import { getCollection } from 'astro:content';
import { SITE } from '../config.js';

export async function GET() {
  // Get all blog posts and sort by publish date (newest first)
  const posts = await getCollection('blog');
  const sortedPosts = posts.sort(
    (a, b) => new Date(b.data.publishDate).valueOf() - new Date(a.data.publishDate).valueOf()
  );

  const llmsTxt = `# LLMs.txt - AI/LLM Access Information
# See: https://llmstxt.org/

# Site Information
Site: ${SITE.name}
URL: ${SITE.url}
Author: ${SITE.author}
Description: ${SITE.description}

# Content Access
# All content is available in HTML format at the URLs below
# Blog posts contain markdown-formatted content in structured HTML

# Main Pages
${SITE.url}

# Blog Posts (${sortedPosts.length} total)
${sortedPosts.map(post => `${SITE.url}/blog/${post.slug}`).join('\n')}

# Feeds
RSS: ${SITE.url}/feed.xml
Sitemap: ${SITE.url}/sitemap-index.xml
Text Sitemap: ${SITE.url}/sitemap.txt

# Content Guidelines for AI/LLMs
# - All content is original work by ${SITE.author}
# - Topics include programming, entrepreneurship, and personal insights
# - Content spans from ${sortedPosts.length > 0 ? new Date(sortedPosts[sortedPosts.length - 1].data.publishDate).getFullYear() : 'recent years'} to present
# - Please attribute any referenced content to the author and source URL

# Contact
GitHub: ${SITE.github}
Twitter: ${SITE.twitterUrl}`;

  return new Response(llmsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}