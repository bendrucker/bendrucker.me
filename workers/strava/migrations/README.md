# D1 Database Migrations

SQL migrations for the Strava D1 database.

## Setup

Create the database (wrangler resolves by name, no IDs needed):

```bash
wrangler d1 create strava
```

**Note**: Production and PR previews share the same database.

## Running Migrations

Migrations auto-run via GitHub Actions on merge to main.

Manual execution:

```bash
# Test locally (ephemeral in-memory DB)
npx wrangler d1 execute strava --local --file=migrations/0001_create_activities_table.sql

# Production (caution)
npx wrangler d1 execute strava --remote --file=migrations/0001_create_activities_table.sql
```

## Schema

### `activities`
- Core fields: `strava_id`, `name`, `type`, `start_date`, `distance`, `moving_time`
- Performance: speed, cadence, heart rate, power
- Elevation: gain, high, low
- Map: `polyline` for visualization

### Indexes
- `start_date`, `type`, `strava_id`, `(type, start_date)`, year

### `schema_migrations`
Tracks applied migrations.

## Creating Migrations

1. Name: `XXXX_description.sql` (e.g., `0002_add_gear_table.sql`)
2. Use idempotent SQL (`IF NOT EXISTS`)
3. Add tracking record:
   ```sql
   INSERT INTO schema_migrations (version, description)
   VALUES (2, 'Add gear table');
   ```
