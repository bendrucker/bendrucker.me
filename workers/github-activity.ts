import { fetchGitHubActivity, type RepoActivity } from '../src/services/github'

interface Env {
  GITHUB_TOKEN: string
  ACTIVITY_KV: KVNamespace
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    
    if (url.pathname === '/activity' && request.method === 'GET') {
      try {
        // Try to get cached data from KV
        const cachedData = await env.ACTIVITY_KV.get('github-activity', 'json')
        
        if (cachedData) {
          return new Response(JSON.stringify(cachedData), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=3600' // 1 hour browser cache
            }
          })
        }
        
        // If no cached data, return empty array (shouldn't happen in production)
        return new Response(JSON.stringify([]), {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      } catch (error) {
        console.error('Error fetching activity:', error)
        return new Response(JSON.stringify({ error: 'Failed to fetch activity' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
    }
    
    return new Response('Not Found', { status: 404 })
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const startTime = Date.now()
    
    try {
      console.log('Fetching GitHub activity data...')
      
      if (!env.GITHUB_TOKEN) {
        throw new Error('GITHUB_TOKEN environment variable is required')
      }
      
      const activityData = await fetchGitHubActivity(env.GITHUB_TOKEN)
      
      // Store in KV with TTL of 7 days (longer than cron interval for resilience)
      await env.ACTIVITY_KV.put(
        'github-activity',
        JSON.stringify(activityData),
        { 
          expirationTtl: 7 * 24 * 60 * 60, // 7 days
          metadata: {
            lastUpdated: new Date().toISOString(),
            repositoryCount: activityData.length,
            fetchDurationMs: Date.now() - startTime
          }
        }
      )
      
      console.log(`✓ Stored ${activityData.length} repositories in KV (${Date.now() - startTime}ms)`)
    } catch (error) {
      console.error('✗ Failed to update GitHub activity:', error)
      
      // Store error info in KV for debugging (with shorter TTL)
      try {
        await env.ACTIVITY_KV.put(
          'github-activity-error',
          JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime
          }),
          { expirationTtl: 60 * 60 } // 1 hour
        )
      } catch (kvError) {
        console.error('Failed to store error info:', kvError)
      }
      
      throw error
    }
  }
}
