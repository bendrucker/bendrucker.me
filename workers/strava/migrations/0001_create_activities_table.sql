-- Migration: Create activities table for Strava fitness data
-- Created: 2025-11-10

-- Schema migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (unixepoch()),
  description TEXT NOT NULL
);

-- Main activities table
CREATE TABLE IF NOT EXISTS activities (
  -- Primary identification
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  strava_id INTEGER UNIQUE NOT NULL,

  -- Basic activity info
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  sport_type TEXT,

  -- Timestamps (stored as Unix epoch seconds)
  start_date INTEGER NOT NULL,
  timezone TEXT,

  -- Distance and time metrics
  distance REAL, -- meters
  moving_time INTEGER, -- seconds
  elapsed_time INTEGER, -- seconds

  -- Speed metrics
  average_speed REAL, -- meters per second
  max_speed REAL, -- meters per second

  -- Performance metrics
  average_cadence REAL, -- RPM for cycling
  average_heartrate REAL, -- BPM
  max_heartrate REAL, -- BPM
  average_watts REAL, -- power output
  max_watts REAL, -- power output
  kilojoules REAL, -- total energy

  -- Elevation data
  total_elevation_gain REAL, -- meters
  elev_high REAL, -- meters
  elev_low REAL, -- meters

  -- Location data
  start_latlng TEXT, -- JSON array [lat, lng]
  end_latlng TEXT, -- JSON array [lat, lng]

  -- Map visualization (polyline encoding)
  polyline TEXT,

  -- Weather conditions
  average_temp REAL, -- Celsius

  -- Additional metadata
  description TEXT,
  calories REAL,
  device_name TEXT,
  gear_id TEXT,

  -- Achievement counts
  achievement_count INTEGER DEFAULT 0,
  kudos_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,

  -- Flags
  manual BOOLEAN DEFAULT FALSE,
  private BOOLEAN DEFAULT FALSE,
  flagged BOOLEAN DEFAULT FALSE,

  -- Tracking
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes for common query patterns

-- Index for chronological queries (most common)
CREATE INDEX idx_activities_start_date ON activities(start_date DESC);

-- Index for filtering by activity type
CREATE INDEX idx_activities_type ON activities(type);

-- Index for Strava ID lookups (for updates/webhooks)
CREATE INDEX idx_activities_strava_id ON activities(strava_id);

-- Composite index for type + date queries (e.g., "all cycling activities from 2024")
CREATE INDEX idx_activities_type_date ON activities(type, start_date DESC);

-- Index for year-based queries using SQLite's date functions
CREATE INDEX idx_activities_year ON activities(strftime('%Y', start_date, 'unixepoch'));

-- Record this migration
INSERT INTO schema_migrations (version, description)
VALUES (1, 'Create activities table with indexes');
