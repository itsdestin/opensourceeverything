-- "I want this too" on requested closed apps and groups, and "Tag my project" pitches. Rules: docs/server-rules.md.
-- Run later with: wrangler d1 migrations apply opensourceeverything --remote   (not run yet)

-- One row per person per request. WHY a key, not a notes row: a request can be a gap group ("group:signing"), a closed
-- app ("app:Procreate") or a suggestion still waiting on GitHub ("issue:123"); none of those is a note with a group.
CREATE TABLE request_votes (
  key TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created INTEGER NOT NULL,
  PRIMARY KEY (key, user_id)
);
CREATE INDEX request_votes_key ON request_votes(key);

-- A developer's pitch for their own listed project ("From the Developer").
-- WHY live and pending are separate: the approved text keeps showing while an edit waits for a mod, and unreviewed
-- words never reach the public page.
CREATE TABLE pitches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo TEXT NOT NULL,                  -- "github.com/owner/name", lower case
  project TEXT NOT NULL,               -- the listed project's id
  proof TEXT NOT NULL CHECK (proof IN ('own-account', 'file')),
  token TEXT NOT NULL,                 -- what the proof file must contain (file method)
  verified_at INTEGER,                 -- null until ownership is proven
  live TEXT,                           -- JSON: the approved pitch
  pending TEXT,                        -- JSON: submitted, waiting for a mod
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'live', 'turned-down')),
  reason TEXT,                         -- a mod's reason when turned down
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  UNIQUE (user_id, repo)
);
CREATE INDEX pitches_project ON pitches(project, status);
