CREATE TABLE repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  primary_language_name TEXT,
  primary_language_color TEXT,
  stargazer_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(owner, name)
);

CREATE TABLE repo_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repos(id),
  year INTEGER NOT NULL,
  pr_count INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  issue_count INTEGER NOT NULL DEFAULT 0,
  merge_count INTEGER NOT NULL DEFAULT 0,
  has_merged_prs INTEGER NOT NULL DEFAULT 0,
  last_activity TEXT NOT NULL,
  UNIQUE(repo_id, year)
);

CREATE INDEX idx_repo_activity_year ON repo_activity(year);
CREATE INDEX idx_repo_activity_last ON repo_activity(last_activity DESC);
CREATE INDEX idx_repos_owner ON repos(owner);
CREATE INDEX idx_repos_language ON repos(primary_language_name);
