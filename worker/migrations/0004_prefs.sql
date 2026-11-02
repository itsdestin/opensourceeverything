-- Contributor preferences ("How you'd like help"): one set per claimed project, saved as the owner changes them.
-- Run later with: wrangler d1 migrations apply opensourceeverything --remote   (not run yet)
-- WHY one row per project and a JSON column: every answer comes from a fixed list (worker/src/rules.js cleanPrefs), so there is nothing to query by.
-- WHY user_id is kept: the public read only shows a set while that same account's claim still stands.
CREATE TABLE IF NOT EXISTS prefs (
  project TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  data    TEXT NOT NULL,
  updated INTEGER NOT NULL
);
