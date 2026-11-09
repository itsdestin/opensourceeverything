---
status: active
updated: 2026-11-09
---
# Where the site stands (Nov 9, 2026)

The single place to start. Older plans are in `docs/archive/` (history only: many of their details were later changed).

<!-- WHY rewritten Nov 9: the Nov 2 version didn't mention the evidence branch, still showed the boards as live, and listed decided items as open. -->

## In one paragraph

**Live** (`main`, deployed Nov 2): the redesign built to YouCoded's design guide: 6 areas, 24 categories, 263 groups and
980 projects shown, smarter search, feature checklists, switch guides, project claims and an AI connector. Database
changes 0002–0004 ran on Nov 2 (copy taken just before: `~/.local/share/ose-backups/db-before-0002-2026-11-02.sql`). The
"What's missing" boards are off the pages; the server still stores 13 short notes from itsdestin, shown nowhere.

**Not live, on branch `evidence`** (worktree `~/trueopensource/worktrees/evidence`): the evidence map's step 1 (built and
approved) and step 2's design (look in round 3). The plan is `docs/evidence-map-design.md`; every community decision is
in `docs/community-history.md`. Nothing on this branch reaches the site until Destin says so.

## Done on `evidence` (step 1, approved by Destin Nov 2)

- Paid apps answer the same feature checklists as open projects: 648 apps, 3,217 answers, each with a source. About 1 in 5
  is blank ("not checked yet") because no page clearly answered it.
- Paid apps sit in each Compare table above the open projects, tagged "Proprietary" (no divider rows).
- Every answer carries a small source label; tapping it shows the quote, source, "AI-researched" and the date.
- Every paid app's page has a "How they compare" table. The Gaps page counts only features a paid app really has.
- A "How we check" page, with hand checks: 56 answers in the 8-app trial (3 wrong, rules then fixed) and 60 random
  answers from the full run (1 wrong, fixed).
- The paid-app list was tidied first (`docs/closed-apps-cleanup.md`, done). 8 renamed apps appear under their new names.
  No "Discontinued" label anywhere (Destin turned it down).

## In progress on `evidence` (step 2: what people say about each feature)

The design is approved (`docs/community-history.md`). The look went through two review decks; round 2 was approved
except three notes, which are next:
1. The Cards / Compare switch: the coloured fill doesn't sit properly inside it.
2. "From the developer" in the popup: simplify it.
3. "What stopped people" on project pages: keep it behind a button, styled properly, with comments as cards.

Then: a round-3 deck; after approval, the real server part (database tables, checks, mod tools, a nightly copy of
people's answers into the data files so filters and the Gaps page use them), tests, a code review, and a final check.
Today it works only against the preview's pretend server, with made-up sample votes.

## Not done yet: needs Destin

| Item | Notes |
|---|---|
| Put step 1 live | Merge `evidence` into `main` and deploy. Only on his word. Could go before step 2 is finished |
| Five small step-1 points from the design reviewer, on parts he had already approved | The faint "not checked yet" dot; Compare sits behind the Filter button on phones; dotted underline on column names; the long Gaps page doesn't fold on phones; tall tables (Notion's has about 20 rows). Recommendation: leave all five |
| Glass blur on the top controls | Live everywhere (recommended). Drop it on phones only if it feels slow there |
| $5/month Cloudflare plan for meaning search | Optional; the trial was a small gain; switched off. See `docs/ai-search.md` |
| Say "subcategory" instead of "group" across the site? | Not discussed yet |
| Rename the "Everyday life" category (it sits inside "Everyday apps") | Not discussed yet |
| The 13 stored starter notes | Shown nowhere since the boards came off; keep or delete |
| Delete the Anthropic API key pasted in chat | Kept on purpose for research runs; delete at Anthropic's console when done. Local copy: `~/.config/alternatives-map/anthropic-key` |
| Launch post and message drafts | `docs/launch.md` still says "about 430 projects"; update the number before sending |

## Housekeeping

- The `review-plan` branch and worktree (`~/trueopensource/worktrees/review-plan`) are older and not merged into `main`.
- Deck pages and their pictures under `docs/decisions/` (html, images, runs folders) stay unsaved in git on purpose
  (large); the deck questions (`.json`) and Destin's answers (`.answers.json`) are saved.

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
- **About 79 switch guides** and **about 527 open-project checklist answers** are still blank, plus about 1 in 5 paid-app answers.
- **Search misses:** "claude code" and "linux" put a niche result first. Tests: `site/test/search-eval.mjs`.
- **Ubuntu Touch:** the fact-check flagged it; left as is.
- **Reddit bot** that posts one thread per group: idea only.

## How things are built

| Job | Command (from the repo root) |
|---|---|
| Rebuild the data | `node prefill/assemble.mjs`, then `git checkout prefill/out/summary.md` |
| Re-import research | `node prefill/import-research.mjs docs/research`, then `node prefill/merge-checklists.mjs` |
| Paid apps' answers (paid, AI) | `node prefill/closed-answers.mjs --count` first (free estimate), then without `--count`, then `node prefill/merge-closed-answers.mjs` |
| Sync the suggestion forms | `node prefill/sync-forms.mjs` |
| Build and check the site | `node site/build.mjs`, then `node site/check.mjs` |
| Preview | `node site/serve.mjs 4322`; build with `API_URL=demo` to use the pretend server (`?preview-as=member\|penpot-team\|new` signs in a sample person) |
| Server locally | `cd worker && npm run dev` (port 8787), with the preview running |
| Search phrases (paid, AI) | `node prefill/search-keywords.mjs --parallel 4 --only <ids>`. Count or dry-run first; the key allows about 4 requests at once |

Key files: `prefill/taxonomy.json` (areas, categories, moved and new groups), hand fixes in
`prefill/{data-fixes,platform-fixes,setup-ratings,license-fixes}.json`, new-group steps in
`prefill/new-group-{facts,review,checklists,answers}.mjs`, paid-app answers in `data/closed-apps.json`.
**AI spend so far:** about $8.50 before Nov 2, $30.67 for the paid-app research run, $0.62 re-researching renamed apps,
plus a small 8-app trial.

## Design rules that came out of Destin's reviews

- Follow YouCoded's design guide (`~/youcoded-dev/docs/active/design/2026-10-13-ui-design-guide.md`) and copy YouCoded's
  real pieces rather than inventing new ones (Nov 3: "too many unique elements"). Exception: the glass top controls and
  the phone tab bar may have their own look. When two guide rules conflict, ask Destin.
- No filler: drop anything that doesn't help someone find their way in a way nothing else on the page does. No repeated text.
- No extra labels or marks in headers and tables (Nov 2: no "Discontinued" label).
- GitHub stars come first when a project has them. "Easy setup" / "Advanced setup" are tags that explain themselves when clicked.
- Filters are a single Filter button that opens a sheet (a full slide-up sheet on phones), not rows of chips.
- Home: one "Browse by category" card; each area is a boxed fold; all start closed and only one opens at a time (Nov 2).
- The AI-assistance line reads: "This listing is managed by r/TrueOpenSource and was drafted with AI assistance.
  If you maintain this project, claim this listing here."
- Developer pitches are labelled "From the Developer", never "Owner says".
- Deck answers: Oct 26–31 in the `archive/review-plan-2026-10-31` tag; Nov 2 onward in `docs/decisions/` on `evidence`.

## Where things are

- `docs/evidence-map-design.md`: the agreed long plan (steps 0–5) and where each step stands.
- `docs/community-history.md`: every community decision Destin has made, and the step-2 design.
- `docs/server-rules.md`: what the server allows and checks (kept in step with `site/assets/fake-api.js`; step 2's calls
  are marked as pretend-server only).
- `docs/closed-apps-cleanup.md`: the finished paid-app tidy.
- `docs/mod-review.md`: the mods' decisions (licenses, Verified tags).
- `docs/tokens-and-secrets.md`: tokens production can use (none created yet).
- `docs/ai-search.md`: the meaning-search trial (off).
- `docs/starter-review.md`: written by the weekly refresh robot; don't edit by hand.
- `docs/research/`: the research the checklists, switch guides and AI labels came from. Only `prefill/import-research.mjs` reads it.
- `docs/archive/`: the first plans (`original-plan.md`, `v1-plan.md`), the boards thinking, the 24-group review and the Oct 26 outside review.
- Design decks before Nov 2 and their screenshots (278 MB) are kept out of the branches, in the git tag
  `archive/review-plan-2026-10-31`. See them with `git worktree add ../decks archive/review-plan-2026-10-31`.
