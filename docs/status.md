---
status: active
updated: 2026-11-02
---
# Where the site stands (Nov 2, 2026)

The single place to start. Older plans are in `docs/archive/` (history only: many of their details were later changed).

## In one paragraph

<!-- WHY rewritten Nov 2: the redesign went live; the "not live yet" text and merge steps no longer applied. -->
opensourceeverything.org went live on Oct 27 with the first version. On **Nov 2** the redesign was merged into `main` and
deployed: the new look built to YouCoded's design guide, the new map structure (6 areas, 24 categories, 263 groups and 980
projects shown), smarter search, feature checklists, switch guides, safer project claims and an AI connector. Database
changes 0002–0004 ran on the live database (a copy taken just before is at `~/.local/share/ose-backups/db-before-0002-2026-11-02.sql`).
New work goes on a branch off `main`; every push to `main` republishes the pages, and `cd worker && npm run deploy` deploys the server.

## What comes after launch

<!-- WHY: Nov 2 Destin agreed a wider design (evidence labels, closed-app checklists, tests, connections, stack pages); point the next session at it. -->
The agreed next design is in `docs/evidence-map-design.md` (not built yet).

## Not done yet: needs Destin

| Item | Notes |
|---|---|
| Glass blur on the top controls | Live with the blur everywhere (the recommended choice). Drop it on phones only if it feels slow there |
| $5/month Cloudflare plan for meaning search | Optional. The trial was a small gain; it's switched off. See `docs/ai-search.md` |
| Delete the Anthropic API key pasted in chat | It's at Anthropic's console; the local copy is `~/.config/alternatives-map/anthropic-key` |
| Launch post and esk message | Drafts in `docs/launch.md`; the project count in them is stale (980 shown now) |
| Delete the 13 old seed notes | From the first "What's missing" seed; `worker/seed-notes.mjs` replaced them. Deleting live data: ask Destin first |

## Deploying

1. Checks: `node site/build.mjs && node site/check.mjs`, the site tests (`node --test site/test/escape.test.mjs site/test/family.test.mjs`,
   `node site/test/search-eval.mjs` plus `--heldout` and `--described`), and the server tests (`cd worker && npm run dev` in one
   terminal, with the preview on :4322, then `npm test`).
2. Pages: push to `main`; the "Site" workflow publishes them.
3. Server: `cd worker && npm run deploy` (new database changes first, then the code). Nov 2: the first try failed with a Cloudflare
   "Internal authentication error" (code 10500) after the database step; running `npx wrangler deploy --env=""` again worked.
4. Check the live site and `https://api.opensourceeverything.org/me`.

## Data work still open (not blocking)

- **78 licenses read by AI** wait for a mod to confirm (`data/license-confirmed.json` is where they're confirmed).
- **33 new groups** have 2 projects and stay hidden until a third arrives. **"Linux for old or slow computers"** (`distros-light`) is empty.
- **About 79 switch guides** and **about 527 checklist answers** are still blank.
- **Search misses:** "claude code" and "linux" put a niche result first. Tests: `site/test/search-eval.mjs`.
- **Ubuntu Touch:** the fact-check flagged it; left as is.
- **Reddit bot** that posts one thread per group: idea only.

## How things are built

| Job | Command (from the repo root) |
|---|---|
| Rebuild the data | `node prefill/assemble.mjs`, then `git checkout prefill/out/summary.md` |
| Re-import research | `node prefill/import-research.mjs docs/research`, then `node prefill/merge-checklists.mjs` |
| Sync the suggestion forms | `node prefill/sync-forms.mjs` |
| Build and check the site | `node site/build.mjs`, then `node site/check.mjs` |
| Preview | `node site/serve.mjs 4322` |
| Server locally | `cd worker && npm run dev` (port 8787), with the preview running |
| Search phrases (paid, AI) | `node prefill/search-keywords.mjs --parallel 4 --only <ids>`. Count or dry-run first; the key allows about 4 requests at once |

Key files: `prefill/taxonomy.json` (areas, categories, moved and new groups), hand fixes in
`prefill/{data-fixes,platform-fixes,setup-ratings,license-fixes}.json`, new-group steps in
`prefill/new-group-{facts,review,checklists,answers}.mjs`. Total AI spend so far: about $8.50.

## Design rules that came out of Destin's reviews

- Follow YouCoded's design guide (`~/youcoded-dev/docs/active/design/2026-10-13-ui-design-guide.md`). Exception: the glass
  top controls and the phone tab bar may have their own look. When two guide rules conflict, ask Destin.
- No filler: drop anything that doesn't help someone find their way in a way nothing else on the page does. No repeated text.
- GitHub stars come first when a project has them. "Easy setup" / "Advanced setup" are tags that explain themselves when clicked.
- Filters are a single Filter button that opens a sheet (a full slide-up sheet on phones), not rows of chips.
- Home: one "Browse by category" card; each area is a boxed fold; all start closed and only one opens at a time (Nov 2).
- The AI-assistance line reads: "This listing is managed by r/TrueOpenSource and was drafted with AI assistance.
  If you maintain this project, claim this listing here."
- Developer pitches are labelled "From the Developer", never "Owner says".
- Every deck's full answers: the `archive/review-plan-2026-10-31` tag, folder `docs/decisions/`.

## Where things are

- `docs/server-rules.md`: what the server allows and checks (kept in step with `site/assets/fake-api.js`).
- `docs/mod-review.md`: the mods' decisions (licenses, Verified tags).
- `docs/tokens-and-secrets.md`: tokens production can use (none created yet).
- `docs/ai-search.md`: the meaning-search trial (off).
- `docs/starter-review.md`: written by the weekly refresh robot; don't edit by hand.
- `docs/research/`: the research the checklists, switch guides and AI labels came from. Only `prefill/import-research.mjs` reads it.
- `docs/archive/`: the first plans (`original-plan.md`, `v1-plan.md`), the boards thinking, the 24-group review and the Oct 26 outside review.
- Design decks and their screenshots (278 MB) are kept out of the branches, in the git tag
  `archive/review-plan-2026-10-31`. See them with `git worktree add ../decks archive/review-plan-2026-10-31`.
