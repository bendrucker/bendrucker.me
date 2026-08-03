CREATE TABLE sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 0,
  payload_hash TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO sync_state (id) VALUES (1);
