-- Security hardening for "Claim your project" and everything people write. Rules: docs/server-rules.md.
-- Run later with: wrangler d1 migrations apply opensourceeverything --remote   (not run yet)

-- WHY a flag on every post: the content filter holds a post for a mod instead of refusing it, and the mod needs to
-- see why it was held ("language", "spam", "suspicious link").
ALTER TABLE notes ADD COLUMN flag TEXT;
ALTER TABLE replies ADD COLUMN flag TEXT;

-- Claims. WHY each column:
--  token_expires  the proof-file text is only good for 48 hours, and only once (it is replaced when used)
--  repo_id        GitHub's permanent number for the repo: if someone re-creates a repo under a freed-up name, the number differs
--  stars          what GitHub said when the claim was checked (mods see it)
--  needs_confirm  1 = a mod must confirm the person really owns/administers the project before anything shows
--  flags          JSON list of reasons (fork, high-profile, owner-unverified, looks-different)
--  confirmed_by/at  the mod who confirmed, and when ("Ownership confirmed by mods" on the site)
--  approved_at    when the live text was approved: the earliest approved claim is the one shown
ALTER TABLE pitches ADD COLUMN token_expires INTEGER;
ALTER TABLE pitches ADD COLUMN repo_id INTEGER;
ALTER TABLE pitches ADD COLUMN stars INTEGER;
ALTER TABLE pitches ADD COLUMN needs_confirm INTEGER NOT NULL DEFAULT 1;
ALTER TABLE pitches ADD COLUMN flags TEXT NOT NULL DEFAULT '[]';
ALTER TABLE pitches ADD COLUMN confirmed_by TEXT;
ALTER TABLE pitches ADD COLUMN confirmed_at INTEGER;
ALTER TABLE pitches ADD COLUMN approved_at INTEGER;
ALTER TABLE pitches ADD COLUMN flag TEXT;
-- Claims made before this migration were never confirmed by a mod: they stay hidden until one confirms them.
