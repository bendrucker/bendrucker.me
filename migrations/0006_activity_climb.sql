-- The climbs a ride contains, one row per segment of its elevation profile
-- that gained enough to count. They are computed once on publish rather than
-- on every read, because naming one asks OpenStreetMap what stands at its
-- summit and a page load cannot wait on that.
CREATE TABLE activity_climb (
  activity_id TEXT NOT NULL REFERENCES activity_feed(activity_id) ON DELETE CASCADE,
  -- Order along the ride, from 0.
  position INTEGER NOT NULL,
  gain_m REAL NOT NULL,
  summit_lat REAL NOT NULL,
  summit_lng REAL NOT NULL,
  -- Null when OpenStreetMap named nothing near the summit.
  name TEXT,
  PRIMARY KEY (activity_id, position)
);
