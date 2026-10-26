---
status: active
---
# The rules the server enforces (voting, notes, boards)

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
- Rate limits per account and per IP: votes 60/min, posts 10/hour, replies 30/hour, reports 20/hour.
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
