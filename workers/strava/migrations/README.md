# D1 Database Migrations

This directory contains SQL migrations for the Strava D1 database.

## Database Setup

The D1 database is configured to auto-resolve by name:

```bash
# Create the production database
wrangler d1 create strava
```

No need to update `wrangler.toml` with database IDs - wrangler resolves databases by name automatically.

**Important**: Both production deployments and PR preview deployments use the same `strava` database. Preview deployments **must be strictly read-only** to avoid polluting production data.

## Running Migrations

### Local Development

To test migrations locally using wrangler's in-memory database:

```bash
cd workers/strava

# Apply all migrations
npx wrangler d1 execute strava --local --file=migrations/0001_create_activities_table.sql

# Or apply a specific migration
npx wrangler d1 execute strava --local --file=migrations/XXXX_migration_name.sql
```

Note: `--local` uses an ephemeral in-memory database for testing. It does not affect the remote production database.

### Production Database

Migrations are **automatically applied** via GitHub Actions when merging to the main branch.

To manually run migrations on production (use with caution):

```bash
cd workers/strava
npx wrangler d1 execute strava --remote --file=migrations/0001_create_activities_table.sql
```

## Migration Naming Convention

Migrations follow the pattern: `XXXX_description.sql`

- `XXXX`: Sequential number (0001, 0002, etc.)
- `description`: Brief description of the migration in snake_case

Example: `0001_create_activities_table.sql`

## Schema Overview

### `activities` Table

Stores Strava activity metadata for efficient querying and display.

**Key Fields:**
- `strava_id`: Unique Strava activity identifier
- `type`: Activity type (Ride, Run, etc.)
- `start_date`: Unix timestamp of activity start
- Performance metrics: speed, cadence, heart rate, power
- Elevation data: gain, high, low
- Map data: `polyline` field for visualization

**Indexes:**
- `start_date` - Chronological queries
- `type` - Activity type filtering
- `strava_id` - Quick lookups for updates
- `(type, start_date)` - Composite for filtered queries
- Year extraction - Year-based filtering

### `schema_migrations` Table

Tracks applied migrations to prevent duplicate execution.

## Creating New Migrations

1. Create a new file in `migrations/` with the next sequential number
2. Write idempotent SQL (use `IF NOT EXISTS`, `IF NOT EXIST`, etc.)
3. Include a record in `schema_migrations` at the end:
   ```sql
   INSERT INTO schema_migrations (version, description)
   VALUES (N, 'Description of migration');
   ```
4. Test locally with `--local` flag
5. Commit and merge to main branch for automatic production deployment

## Querying the Database

### Via Wrangler CLI

```bash
# Local/preview database
npx wrangler d1 execute strava --local --command="SELECT COUNT(*) FROM activities"

# Production database
npx wrangler d1 execute strava --remote --command="SELECT COUNT(*) FROM activities"
```

### In Worker Code

```typescript
// Query activities
const result = await env.DB.prepare(
  "SELECT * FROM activities WHERE type = ? ORDER BY start_date DESC LIMIT 10"
).bind("Ride").all();

console.log(result.results);
```

## Best Practices

1. **Idempotent Migrations**: Always write migrations that can be safely run multiple times
2. **Test Locally**: Use `--local` flag to test migrations before deploying
3. **No Rollbacks**: Design migrations to be additive when possible
4. **Version Control**: All migrations must be committed to git
5. **Sequential Numbering**: Maintain strict sequential order to avoid conflicts

## Troubleshooting

### Error: "Database not found"

Make sure you've created the database and updated `wrangler.toml` with the correct database IDs.

### Error: "Migration already applied"

This is expected behavior for idempotent migrations. The schema uses `IF NOT EXISTS` clauses to allow safe re-runs.

### Testing Migration Syntax

Validate SQL syntax without executing:

```bash
sqlite3 :memory: < migrations/0001_create_activities_table.sql
```
