---
status: active
---
# The rules the server enforces (voting, notes, boards, requests, developer pitches)

The real server (Cloudflare Worker + D1) and the preview's pretend server (`site/assets/fake-api.js`) obey exactly
this list. The page never decides anyone's rights: every note comes back with a `can` list saying what the signed-in
person may do with it, and the page only shows those buttons. Decisions: Destin, Oct 27 (from `docs/discussion-design.md`
and the review of the draft).

## Numbers (returned by `GET /me` as `rules`, so the page never hard-codes them)
- `minAgeDays: 14`: a GitHub account must be this old to vote, rate or confirm.
- `confirmsNeeded: 3`: "it's fixed" closes after this many confirmations from other people.
- `popularVotes: 25`: a missing feature with this many votes asks mods whether "Replaces fully" should change.
- Limits: titles 140 characters, bodies and replies 4,000, links 500. Only `http(s)://` links.

## Who can do what
| Action | Who | Notes |
|---|---|---|
| Vote ("Me too" / "I want this") on a note | signed in, account ≥ 14 days, not banned | one per person per note; not on Discussions; not on held or closed notes |
| Rate a listing (Yes / Not really) | same | value is 1, -1 or 0 (take back); one per person per project per job |
| Post a note | signed in, not banned | **held** (only author and mods see it) when it's the account's first post of any kind and the account is under 14 days old |
| Reply | signed in, not banned | same hold rule; not on closed notes or held notes |
| Edit own note or reply | the author | any time; shows "edited" |
| Delete own note or reply | the author | any time; a deleted note takes its votes and replies with it |
| "It's fixed now" (missing features) | signed in, not banned | needs a link; one open claim at a time; the claimer can withdraw it |
| Confirm it's fixed | account ≥ 14 days, not the claimer | one per person; closes as fixed at 3 |
| "I'm building this" (wishes) | signed in, not banned | needs a link; shown as "@name says they're building this"; the claimer, the wish's author or a mod can remove it |
| Report | signed in | once per person per note |
| Close (fixed / won't happen / duplicate), reopen | mods | reopening clears an old fixed claim |
| Approve or hide held posts, hide reported posts, ban | mods | ban asks to confirm; a banned account's held posts are removed |

| "I want this too" on a request | signed in, account ≥ 14 days, not banned | one per person per request; can be taken back. Only gaps can be requested (a group nothing open fully does, or a closed app whose groups are all such gaps) and suggestions still **open** on GitHub (`group:<id>`, `app:<name>`, `issue:<number>`) |
| Tag my project: start | signed in, not banned | the link must be a project page on GitHub, GitLab or Codeberg **already listed on the map**; if it isn't, nothing is stored and the page sends them to the "Add a project" GitHub form |
| Ownership proof | the person who started it | **own GitHub account**: the repo's owner is the signed-in login (GitHub's public API confirms the repo exists under it) = proven at once. **Organization, GitLab or Codeberg**: the Worker looks for a file `.opensourceeverything` in the project's main folder containing the one-time text we gave them (`ose-…`) |
| Send or edit a pitch | the proven owner | needs ≥1 group (max 5), "What does yours do differently?" (≤600 characters), one of the four built labels (hand-built, ai-assisted, agentic, vibe-coded); strengths, weaknesses, reusable parts, help wanted are optional (≤1,000 each). Always goes to **pending**; an edit sets it back to pending, **and the approved text keeps showing** until the edit is approved |
| Remove a pitch | its owner | takes it off the site |
| Approve / turn down a pitch | mods | approve makes the pending text live ("From the Developer"); turn down keeps any live text and shows the owner the reason |
| Your suggestions | signed in | the person's own issues labelled `suggestion` in the GitHub repo, read from GitHub's public API (never written) |
| Mod Suggestions list | mods | open suggestion issues, oldest first, with the robot's verdict label |

**Mods:** GitHub usernames on a list kept on the server (an environment setting), never sent by the page. Today: `itsdestin`.

## What the server never trusts from the page
Who is signed in, their account age, whether they're a mod, the author of a post, whether a post is held, a note's
status, vote counts. All of those are decided and stored by the server.

## Security
- Sign-in with GitHub asks for no permissions; the server keeps only the GitHub id, username and account creation date,
  and throws away GitHub's access key right after reading them. One-time `state` check on every sign-in.
- After sign-in the server only returns people to `https://opensourceeverything.org/…`; any other return address is ignored.
- Session: an httpOnly, Secure, SameSite=Lax cookie on `api.opensourceeverything.org`; 30 days; "sign out" ends it.
- Every change (POST, PATCH, DELETE) must carry the `X-OSE: 1` header and come from the exact origin
  `https://opensourceeverything.org` (checked with the Origin header); CORS allows only that origin, with credentials.
- Rate limits per account and per IP: votes 60/min (this includes "I want this too"), posts 10/hour, replies 30/hour, reports 20/hour, pitches 10/hour, proof-file checks and project lookups 20/hour (so the server can't be used as a free web fetcher).
- GitHub is only ever read, never written: public suggestion issues and the repos' proof files. Answers are cached for 5 minutes (2 for a person's own list) because GitHub allows 60 unsigned calls an hour per address. An optional read-only token (`GITHUB_READ_TOKEN`) lifts that; see `docs/tokens-and-secrets.md`. If GitHub is unreachable the lists answer "try again in a minute" and Most requested still shows what was voted.
- A pitch's text is plain text like everything else. An approved pitch is only public while its ownership proof still stands.
- Everything people write is stored and shown as plain text; links are turned into links by the page only for http(s),
  with `rel="nofollow ugc noopener"`.
- "Delete my account" removes the account, its notes, replies, votes, ratings and reports.

## The calls (what both servers answer)
- `GET /me` → `{ user: { login, accountDays, canVote, isMod, firstPostHeld } | null, rules }`
- `GET /auth/login?return=…`, `GET /auth/callback`, `POST /auth/logout`, `DELETE /me`
- `POST /ratings/query { pairs: [{group, project}] }` → `{ "group/project": { up, down, mine } }`
- `POST /ratings { group, project, value }`
- `GET /notes?category&group&project&kind&status=open|closed&sort=top|new&limit&cursor` → `{ items, total, next }`
- `GET /counts?group=…` → `{ projectId: open missing-feature count }`
- `GET /notes/:id` → note with `replies` and `can`; `POST /notes`, `PATCH /notes/:id`, `DELETE /notes/:id`
- `POST /notes/:id/vote { on }`, `POST /notes/:id/replies { body }`, `PATCH|DELETE /notes/:id/replies/:rid`
- `POST /notes/:id/fixed { link }`, `DELETE /notes/:id/fixed`, `POST /notes/:id/fixed/confirm`
- `POST /notes/:id/building { link }`, `DELETE /notes/:id/building`, `POST /notes/:id/report { reason }`
- Mods: `POST /notes/:id/status { status }`, `GET /mod/queue`, `POST /mod/act { target, id, action }`

### Requests, pitches, suggestions (added Oct 27; migration `0002_contrib.sql`, not yet run on the live database)
- `GET /requests?limit&keys=a,b` → `{ items: [{ key, kind: group|app|issue, name, href|url, votes, mine, waiting? }], total, can: { vote } }`: ranked by votes, including every suggestion still waiting on GitHub (zero votes allowed)
- `POST /requests/vote { key, on }`
- `GET /me/suggestions` → `{ items: [{ number, name, kind, url, created, status: waiting|needs-mod|approved|live|turned-down, liveUrl?, reason? }] }`. Status comes from labels and how the issue closed: closed as completed = live; closed otherwise = turned down (reason = the last comment by a person); open + `approved` = approved; open + `needs-mod` = needs a mod; else waiting
- `POST /pitches/start { url }` → `{ listed: false }` or `{ listed: true, pitch }` (a draft; with `proofFile` and `proofText` while unproven)
- `POST /pitches/:id/verify`, `PUT /pitches/:id { groups, differs, strengths, weaknesses, reusable, help, built }`, `DELETE /pitches/:id`, `GET /pitches/mine`
- `GET /pitches/live?projects=a,b` → `{ projectId: { by, repo, …pitch, updated } }`: public, approved text only (drawn on cards and project pages by the page, so approval is live with no rebuild)
- Mods: `GET /mod/pitches`, `POST /mod/pitches/:id { action: approve|reject, reason }`, `GET /mod/suggestions` → `{ items: [{ number, name, kind, url, author, created, status, votes, verdict: ok|needs-mod|unchecked }] }` (verdict = the robot's `robot-ok` / `needs-mod` label)

### The suggestion robot (GitHub forms stay the way to suggest)
- Labels the robot sets: `robot-ok`, `needs-mod` (a problem it found, a GitHub account under 14 days old, an earlier open suggestion asking for the same thing, or a failed apply with the reason in a comment). Mods approve with the `approved` label as before.
- After a merge, a comment thanks the person and links to the live page.

## AI access (read-only, no sign-in, no database)

- `POST /mcp`: an MCP server (Streamable HTTP, stateless, spec 2025-06-18; older versions negotiated). Tools: `search`, `alternatives_to`,
  `get_group`, `get_project`, `list_gaps`, `compare`, `how_to_contribute`. `GET`/`DELETE` answer 405 (no streams or sessions).
- `GET /v1/search?q&device&setup&limit`, `/v1/apps/<slug>`, `/v1/groups/<id>`, `/v1/projects/<id>` (and `/contribute`), `/v1/gaps`, `/v1/compare?ids=`.
  `/openapi.json` redirects to the site's built description.
- Open CORS (`*`) on these routes only: public data, no cookies, no credentials. Every other route keeps the site-only rule above.
- Answers come from a copy of `catalog.json` + `search.json` bundled at deploy (`npm run snapshot`), ranked by the site's own
  `search-core.js`. Every answer carries `source.generated`. Redeploy after the site data changes.
- Rate limit: 120 questions per address per minute, counted in server memory (best effort; no database writes on purpose).
- Tools never write anything. Their descriptions tell agents to cite page URLs, respect CC BY-SA 4.0, prefer full + easy-setup
  options for non-technical people, and say listings are AI-drafted and moderator-managed.
