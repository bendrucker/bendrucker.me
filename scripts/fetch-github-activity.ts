#!/usr/bin/env tsx

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { fetchGitHubActivity } from '../src/services/github'

async function main() {
  const startTime = Date.now()
  
  try {
    console.log('🔍 Getting GitHub token from gh CLI...')
    
    // Get GitHub token from gh CLI
    let token: string
    try {
      token = execSync('gh auth token', { encoding: 'utf-8' }).trim()
    } catch (error) {
      throw new Error('Failed to get GitHub token. Run `gh auth login` first.')
    }
    
    if (!token) {
      throw new Error('No GitHub token found. Run `gh auth login` first.')
    }

    console.log('📡 Fetching GitHub activity data...')
    const activityData = await fetchGitHubActivity(token)
    
    // Write to a local JSON file for development
    const outputPath = join(process.cwd(), 'tmp', 'github-activity.json')
    writeFileSync(outputPath, JSON.stringify(activityData, null, 2))
    
    const duration = Date.now() - startTime
    console.log(`✓ Fetched ${activityData.length} repositories (${duration}ms)`)
    console.log(`✓ Data written to ${outputPath}`)
    
    if (activityData.length === 0) {
      console.log('\n⚠️  No repositories with activity found in the last 6 months')
      return
    }
    
    // Show summary
    const summary = activityData.slice(0, 5).map(repo => ({
      repo: `${repo.owner}/${repo.name}`,
      lastActivity: repo.lastActivity.toISOString().split('T')[0],
      prs: repo.activitySummary.prCount,
      reviews: repo.activitySummary.reviewCount,
      issues: repo.activitySummary.issueCount
    }))
    
    console.log('\n📊 Top 5 repositories by activity:')
    console.table(summary)
    
    // Show totals
    const totals = activityData.reduce((acc, repo) => ({
      prs: acc.prs + repo.activitySummary.prCount,
      reviews: acc.reviews + repo.activitySummary.reviewCount,
      issues: acc.issues + repo.activitySummary.issueCount
    }), { prs: 0, reviews: 0, issues: 0 })
    
    console.log(`\n📈 Total activity: ${totals.prs} PRs, ${totals.reviews} reviews, ${totals.issues} issues`)
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()
