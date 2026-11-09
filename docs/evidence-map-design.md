---
status: active
updated: 2026-11-09
---
# Design: the evidence map (agreed with Destin, Nov 2, 2026)

WHY this file: Destin widened the site's purpose on Nov 2. This is the agreed design; `docs/status.md` points here.
<!-- WHY Nov 9: "nothing built" was no longer true; say where each step stands. -->
Where it stands (Nov 9): step 1 is built and approved on the `evidence` branch, not live yet. Step 2 (the community)
is designed and its look is in its third round; its decisions live in `docs/community-history.md`, which replaces §4
points 5–7 below. Steps 3–5 are not started.

## What the site is

A complete, honest map of everything that exists, closed and open: what each thing does, how well, how the pieces
connect, and exactly where open source is missing a piece.

- Everyday people find a replacement and see real evidence of how good it is.
- Builders see the empty spots and the building blocks they could reuse.
- Supporters see which projects lead, so effort and money go there.

The site never argues ("why open source isn't winning"); it shows evidence. Filling the empty spots is how open source
catches up.

## 1. The checklists become the main comparison table

Today: each group has 3–6 yes/partly/no questions (`data/features.json`: 995 questions, 296 groups); only open
projects answer them (4,616 answers, 97% with a source). They power the "Must have" filter and the Compare view.

Changes:
- Closed apps answer the same questions (704 closed apps, about 4,038 answers).
- Important groups grow to 10–15 questions.
- Two kinds of row: features (yes / partly / no) and measurements (a number with a unit, e.g. "Word-file faithfulness: 87%").
- The gaps page is computed from the rows: a feature at least one closed app has and no open project has is a gap
  ("nothing open does live co-editing and opens Word files well"), not only "no project exists".
- Project cards keep their short tags. The full table lives in Compare and on project pages.

## 2. Every value shows where it came from

Each answer and number carries a small, clickable label:
- who filled it: AI-researched, our test, or community-tested;
- source link(s);
- method (for features, the question's existing "meaning" text);
- date last checked.

The label leads with the source ("Source: blender.org · AI-researched"), not with the AI.
A methodology page explains the system and publishes the error rate from a spot-check of AI answers against their
sources. A site-wide note says the map was first filled with AI help and every value links to its source.

## 3. Tests (RTINGS-style)

Every measurement comes from a public **test kit**:

| Part | Content |
|---|---|
| Method | Plain description of what is measured and why |
| Code | The script, public in the repo |
| Fixed inputs | Exact files or data, freely licensed |
| Setup record | App version, operating system, machine |
| Raw results | Full output, not only the score |
| Version | Results from different kit versions are never mixed |
| Match rule | Required; a kit without one is not accepted |

Match rules by kind of test:
- Same answer every time (file faithfulness, size, "opens .docx?"): identical after rounding to a whole percent.
- Naturally varies (start-up time, memory): the robot runs it about 10 times to learn the normal spread; a result
  matches if inside that spread plus the kit's stated margin. Speed is measured relative to a fixed reference app on
  the same machine, so machine speed cancels out.
- Human judgement: same category (yes / partly / no) or within one star.

Our own tests run on GitHub's free Windows, Mac and Linux machines, with public run logs. Pilot: Word-file
faithfulness for office apps (needs freely licensed tricky Word files; we may have to make them).

## 4. The community takes over

1. Anyone submits a result using a published kit, or proposes a new kit (reviewed before it becomes official).
2. The robot re-runs the submitted test on GitHub's machines. A match counts at once. Tests a robot can't run (phone
   apps, human judgement) need a second person instead. Until then the result is labelled "not yet repeated".
3. Results from a project's own developers are labelled as such.
4. A result that doesn't match is shown as "disputed" and triggers more runs.
5–7. **Replaced on Nov 3** (see `docs/community-history.md`): for feature answers, people vote yes / partly / no and
   comment; at 5 answers the average replaces the AI's answer and the AI's original is no longer shown. No stars,
   no separate "rate a submission" step. Points 1–4 (test results) still stand and come with the tests step.

## 5. Connections

- **Connections list on every project page:** built on, copy of, uses data from, gets a feature from ("opens Word files
  using LibreOffice's engine"), direct rivals. Extends `data/lineage.json`; checklist answers can name the project a
  feature comes from.
- **Platform stack pages:** e.g. "Everything behind Google Search" in layers (web copy, index, ranking, money). Each
  layer is a group with its own checklist and shows closed parts, open projects, open data and empty spots. Search
  engines first; then maps, social media, video, cloud storage, AI assistants.
- **New listing kind:** open data and building blocks (OpenStreetMap, Common Crawl, MusicBrainz, reusable code).
- **New outside sources** (none are called by the scripts today; platforms are currently read from links in READMEs):
  Flathub, F-Droid (including its warning labels), winget and Homebrew catalogs; Repology; Wikidata; OpenSSF
  Scorecard; ecosyste.ms; privacy and terms-of-service grades for closed apps (Exodus Privacy, ToS;DR).

## Order of work

WHY the community step moved up to 2 (Destin, Nov 3): step 1 shows every answer and its source, but nobody can correct
one until the community step exists.


| Step | What | Waits on |
|---|---|---|
| 0 | Launch the `redesign` | **Done**: live Nov 2 |
| 1 | Source labels, closed apps answer the checklists, gaps page from features, "How we check" page | **Built and approved** on `evidence`; goes live with Destin's word |
| 2 | People's yes / partly / no and comments on each feature, developer answers, "What stopped it?" (`docs/community-history.md`) | Look: round 3. Then the real server part |
| 3 | Connections lists, open data / building blocks kind, outside sources, search-engine stack page | Review decks |
| 4 | Test kits and the office pilot; community test results and robot re-runs (§3, §4 points 1–4) | |
| 5 | Deeper checklists, more stack pages, more tests | Ongoing |

## Risks to watch

- Denser pages: the simple path (type "Notion", get answers) stays as today; detail is one click deeper.
- AI can cite a real source that doesn't say what it claims: the spot-check and published error rate address this.
- Cost: count and show Destin before any paid run. Spend so far: see `docs/status.md`.
