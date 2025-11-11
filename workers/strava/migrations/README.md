# D1 Database Migrations

SQL migrations for the Strava D1 database using wrangler's built-in migration tracking.

## Setup

```bash
wrangler d1 create strava
```

## Running Migrations

Auto-runs on merge to main via `wrangler d1 migrations apply DB --remote`.

Manual:
```bash
# Local
npx wrangler d1 migrations apply DB --local

# Production
npx wrangler d1 migrations apply DB --remote
```

## Creating Migrations

```bash
npx wrangler d1 migrations create DB "description"
```

Creates `migrations/XXXX_description.sql`. Wrangler tracks applied migrations in `d1_migrations` table.

## Schema

### `activities`
- Core: `strava_id`, `name`, `type`, `start_date`, `distance`, `moving_time`
- Performance: speed, cadence, heart rate, power
- Elevation: gain, high, low
- Map: `polyline`

### Indexes
`start_date`, `type`, `strava_id`, `(type, start_date)`, year
