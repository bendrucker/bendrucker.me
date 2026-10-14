-- The pull requests and issues the site's own GitHub user opened, one row each,
-- keyed by GitHub's node id. The sync writes them beside the yearly counts in
-- repo_activity. A merged or closed row is terminal: the sync never rewrites
-- it, and only an open one is fetched again once its window has passed.
CREATE TABLE pull_requests (
  id TEXT PRIMARY KEY,
  repo_id INTEGER NOT NULL REFERENCES repos(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('OPEN', 'CLOSED', 'MERGED')),
  is_draft INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  merged_at TEXT,
  additions INTEGER NOT NULL DEFAULT 0,
  deletions INTEGER NOT NULL DEFAULT 0,
  -- Every reaction of every kind.
  reactions INTEGER NOT NULL DEFAULT 0,
  UNIQUE(repo_id, number)
);

CREATE INDEX idx_pull_requests_created ON pull_requests(created_at DESC);
CREATE INDEX idx_pull_requests_open ON pull_requests(state) WHERE state = 'OPEN';

-- The same shape without the diff, and with why and when an issue closed,
-- since a closed issue reads differently when it was not planned.
CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  repo_id INTEGER NOT NULL REFERENCES repos(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('OPEN', 'CLOSED')),
  state_reason TEXT,
  created_at TEXT NOT NULL,
  closed_at TEXT,
  reactions INTEGER NOT NULL DEFAULT 0,
  UNIQUE(repo_id, number)
);

CREATE INDEX idx_issues_created ON issues(created_at DESC);
CREATE INDEX idx_issues_open ON issues(state) WHERE state = 'OPEN';
