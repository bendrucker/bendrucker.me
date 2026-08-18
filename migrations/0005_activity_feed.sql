-- One row per activity, written by activity-hub over a service binding. Units
-- are SI throughout: the hub is the system of record and stores metres and
-- seconds, so converting on the way in would make this table disagree with it
-- and put the rounding somewhere nothing can see.
CREATE TABLE activity_feed (
  activity_id TEXT PRIMARY KEY,
  strava_id TEXT,
  name TEXT,
  sport TEXT NOT NULL,
  started_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  distance_m REAL,
  moving_s REAL,
  elevation_m REAL,
  average_watts REAL,
  power_source TEXT NOT NULL,
  -- Encoded polyline, decimated to every tenth point.
  polyline TEXT,
  -- JSON array of 100 altitudes in metres, spaced evenly by distance rather
  -- than by time, so a climb does not stretch across the axis when the rider
  -- slows down on it.
  elevation_profile TEXT,
  photo_keys TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The feed reads newest first, either across every sport or within one.
CREATE INDEX idx_activity_feed_started ON activity_feed(started_at DESC);
CREATE INDEX idx_activity_feed_sport_started ON activity_feed(sport, started_at DESC);

CREATE TABLE activity_power_curve (
  activity_id TEXT NOT NULL REFERENCES activity_feed(activity_id) ON DELETE CASCADE,
  duration_s INTEGER NOT NULL,
  watts REAL NOT NULL,
  PRIMARY KEY (activity_id, duration_s)
);
