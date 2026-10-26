-- Open Source Everything: voting, notes and boards. The rules these tables serve: docs/server-rules.md.
-- WHY GitHub's id as the user key: usernames can change; the id never does.
CREATE TABLE users (
  id INTEGER PRIMARY KEY,           -- GitHub user id
  login TEXT NOT NULL,              -- GitHub username (updated at each sign-in)
  github_created INTEGER NOT NULL,  -- when the GitHub account was made (ms); powers the 14-day rule
  trusted INTEGER NOT NULL DEFAULT 0, -- 1 once a mod approved a post (or the account is old enough)
  banned INTEGER NOT NULL DEFAULT 0,
  joined INTEGER NOT NULL
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,      -- SHA-256 of the cookie's value; the value itself is never stored
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE TABLE oauth_states (
  state TEXT PRIMARY KEY,           -- one-time sign-in check
  return_to TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('missing', 'wish', 'talk')),
  category TEXT NOT NULL,
  grp TEXT NOT NULL,
  projects TEXT NOT NULL DEFAULT '[]',     -- JSON list of project ids
  closed_apps TEXT NOT NULL DEFAULT '[]',  -- JSON list of closed app names
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created INTEGER NOT NULL,
  edited INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fixed', 'wontfix', 'duplicate')),
  held INTEGER NOT NULL DEFAULT 0,
  keep_full INTEGER NOT NULL DEFAULT 0,
  fixed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  fixed_link TEXT,
  building_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  building_link TEXT
);
CREATE INDEX notes_grp ON notes(grp, status);
CREATE INDEX notes_category ON notes(category, status);
CREATE TABLE votes (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, user_id)
);
CREATE TABLE fixed_confirms (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, user_id)
);
CREATE TABLE replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created INTEGER NOT NULL,
  edited INTEGER,
  held INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX replies_note ON replies(note_id);
CREATE TABLE reports (
  note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL,
  PRIMARY KEY (note_id, user_id)
);
CREATE TABLE ratings (
  grp TEXT NOT NULL,
  project TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value INTEGER NOT NULL CHECK (value IN (1, -1)),
  PRIMARY KEY (grp, project, user_id)
);
CREATE TABLE rate_limits (
  key TEXT NOT NULL,                -- e.g. "u:123:post" or "ip:1.2.3.4:vote"
  bucket INTEGER NOT NULL,          -- which time window
  n INTEGER NOT NULL,
  PRIMARY KEY (key, bucket)
);
