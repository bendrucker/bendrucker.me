CREATE TABLE repo_activity_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL REFERENCES repos(id),
  pr_count INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  issue_count INTEGER NOT NULL DEFAULT 0,
  merge_count INTEGER NOT NULL DEFAULT 0,
  has_merged_prs INTEGER NOT NULL DEFAULT 0,
  last_activity INTEGER NOT NULL,
  year INTEGER GENERATED ALWAYS AS (cast(strftime('%Y', last_activity, 'unixepoch') as integer)) STORED,
  UNIQUE(repo_id, year)
);

INSERT INTO repo_activity_new (id, repo_id, pr_count, review_count, issue_count, merge_count, has_merged_prs, last_activity)
SELECT id, repo_id, pr_count, review_count, issue_count, merge_count, has_merged_prs, cast(strftime('%s', last_activity) as integer)
FROM repo_activity;

DROP TABLE repo_activity;
ALTER TABLE repo_activity_new RENAME TO repo_activity;

CREATE INDEX idx_repo_activity_year ON repo_activity(year);
CREATE INDEX idx_repo_activity_last ON repo_activity(last_activity DESC);
