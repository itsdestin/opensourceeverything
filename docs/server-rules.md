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
| Tag my project: start | signed in, not banned, **account ≥ 14 days** | the link must be a project page on GitHub, GitLab or Codeberg **already listed on the map**; if it isn't, nothing is stored and the page sends them to the "Add a project" GitHub form |
| Ownership proof | the person who started it | See "Claiming a project" below. In short: **own GitHub account** (a person, not an organization) = proven by GitHub's public API; **organization, GitLab, Codeberg** = a public member of the organization (GitHub) plus the file `.opensourceeverything` holding a one-time text (`ose-…`, works once, 48 hours). Anything not proven by GitHub alone, every fork, and every high-profile project then also needs a **mod to confirm the owner** before any text shows |
| Send or edit a pitch | the proven owner | needs ≥1 group (max 5), "What does yours do differently?" (≤600 characters), one of the four built labels (hand-built, ai-assisted, agentic, vibe-coded); strengths, weaknesses, reusable parts, help wanted are optional (≤1,000 each). Always goes to **pending**; an edit sets it back to pending, **and the approved text keeps showing** until the edit is approved. Ownership is re-checked on every edit |
| Remove a pitch | its owner | takes it off the site |
| Approve / turn down a pitch | mods | approve makes the pending text live ("From the Developer"); turn down keeps any live text and shows the owner the reason. Approving is refused (409) until the owner is confirmed (when required), and while another person's claim is already live on the same project |
| Confirm owner / revoke a claim | mods | "Confirm owner" is the extra step; "Revoke" takes a claim off the site at once and ends its proof (the person cannot re-prove that claim by themselves) |
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
- Rate limits per account and per IP: votes 60/min (this includes "I want this too"), posts 10/hour, replies 30/hour, reports 20/hour, pitches 10/hour, **new claims 6/hour**, proof-file checks and project lookups 20/hour (so the server can't be used as a free web fetcher). At most 10 claims per account at a time.
- GitHub is only ever read, never written: public suggestion issues and the repos' proof files. Answers are cached for 5 minutes (2 for a person's own list) because GitHub allows 60 unsigned calls an hour per address. An optional read-only token (`GITHUB_READ_TOKEN`) lifts that; see `docs/tokens-and-secrets.md`. If GitHub is unreachable the lists answer "try again in a minute" and Most requested still shows what was voted.
- A pitch's text is plain text like everything else. An approved pitch is only public while its ownership proof still stands: it hides itself when the owner's account is banned, when a mod revokes it, or (if a mod's confirmation is required) until a mod has confirmed. If two people claim one project, the earliest approved claim shows.
- Everything people write is stored and shown as plain text; links are turned into links by the page only for http(s),
  with `rel="nofollow ugc noopener"`.
- "Delete my account" removes the account, its notes, replies, votes, ratings and reports.

## Claiming a project (the "Tag my project" flow)
Why this exists: a stranger must not be able to speak as the official page of a well-known project. Decided by the review of
Oct 27 (`claim-hardening`); the code is `claimPlan` in `worker/src/rules.js`.
- **Only listed projects** can be claimed, by their exact listed code link. A fork under your account is a different link, so it cannot claim its parent. If the listed link itself is a fork, a mod must confirm.
- **Own account**: GitHub's public answer for the repo must say its owner is a *person* whose login is the signed-in login. An organization never counts as "own account".
- **Organization project (GitHub)**: GitHub's public pages cannot say who OWNS or ADMINISTERS an organization (that needs the organization's permission), and a file only proves someone can write to the repo. So: the person must be a **public member** of the organization (checked through GitHub's public member list, no key), must put the one-time file in the repo, and a **mod must confirm** they own or administer it.
- **GitLab / Codeberg**: the file, plus a mod's confirmation. (The same login on another site proves nothing.)
- **Always a mod confirmation** (a second step before anything shows) when: the project is high-profile (Verified, 10,000+ GitHub stars, or on the hand-kept list `data/high-profile.json`: Linux distributions, LibreOffice, Firefox, GIMP, Blender, KDE and GNOME apps, ...), the repo is a fork, the repo has far fewer stars than the listing recorded (it may be a re-created repo under a freed-up name), or ownership was shown only by a file. Pages then say "Ownership confirmed by r/TrueOpenSource mods"; self-proven ones say "Owner checked through GitHub".
- A repo that was **renamed or moved** answers under a new name on GitHub; it cannot be claimed until a mod fixes the listing. GitHub's repo number is stored; if it changes, the claim ends.
- The **proof text** is random, tied to the person and project, valid 48 hours, **single use** (it is replaced the moment it is used, so a leftover file proves nothing again), and an expired one is replaced when someone checks.
- **Re-checks**: every edit re-reads the repo from GitHub (still the same repo number, still under the claimant if they proved it that way). A claim proved only by file expires after 180 days.
- Not possible with public information, so honestly unprotected: a **private** member of an organization with write access can still be confirmed by a careless mod. The mod screen shows the facts to check (account age, stars, fork, organization).

## What people write (the content filter)
One file, `site/assets/filter.js` (words in `site/assets/blocked-words.js`), is used by the server, the preview and the suggestion robot.
- **Held for a mod, never silently dropped**: bad language or hateful words (also spaced, leetspeak, repeated letters), spam phrases, more than 5 links, a link that imitates a well-known site inside prose. The author sees "waiting for a mod"; the mod sees the reason. Applies to notes, replies, edits of both (an edit can put an approved note back on hold), pitches (always held anyway; the reason is attached) and suggestions (the robot adds the reason and `needs-mod`). Approving a held post does not mark the *account* as trusted.
- **Refused with the reason, for links**: not http(s), shorteners (`bit.ly`, ...), a hidden user:password, number addresses, odd port numbers, look-alike letters (`xn--`), and addresses that imitate a well-known site (for links submitted on their own: "fixed" and "I'm building this"). 
- Everything is stored and shown as plain text; the pages escape it (`site/test/escape.test.mjs` fails if a user field is placed into HTML without escaping). Links in text become links only for http(s), with `rel="nofollow ugc noopener"`, and show their address.
- To change the word lists, edit `blocked-words.js`; no other change is needed.

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
- `POST /pitches/start { url }` → `{ listed: false }` or `{ listed: true, pitch }` (a draft; with `proofFile`, `proofText`, `proofExpires` while unproven; `needsConfirm`, `confirmed`, `flags` say whether a mod must confirm the owner and why). Refusals: 403 account too new / not a public member of the organization, 409 repo moved, 429 too many claims
- `POST /pitches/:id/verify`, `PUT /pitches/:id { groups, differs, strengths, weaknesses, reusable, help, built }`, `DELETE /pitches/:id`, `GET /pitches/mine`
- `GET /pitches/live?projects=a,b` → `{ projectId: { by, repo, …pitch, ownerCheck: github|mods, updated } }`: public, approved and (when required) mod-confirmed text only (drawn on cards and project pages by the page, so approval is live with no rebuild)
- Mods: `GET /mod/pitches` (pending and live; with `needsConfirm`, `confirmed`, `flags`, `flag`, `stars`, `ownerDays`, `rivalClaims`), `POST /mod/pitches/:id { action: confirm-claim|approve|reject|revoke, reason }`, `GET /mod/suggestions` → `{ items: [{ number, name, kind, url, author, created, status, votes, verdict: ok|needs-mod|unchecked }] }` (verdict = the robot's `robot-ok` / `needs-mod` label)

### The suggestion robot (GitHub forms stay the way to suggest)
- Labels the robot sets: `robot-ok`, `needs-mod` (a problem it found, a GitHub account under 14 days old, an earlier open suggestion asking for the same thing, or a failed apply with the reason in a comment). Mods approve with the `approved` label as before.
- After a merge, a comment thanks the person and links to the live page.
