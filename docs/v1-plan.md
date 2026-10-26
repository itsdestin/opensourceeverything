# Alternatives Map: the v1 plan (rev. 2, Oct 26, 2026)

Replaces the build order in `original-plan.md` (kept for history).

## Destin's calls (Oct 26)

- **v1 is the full vision:** ratings, gap votes, on-page discussion, Tag my project, Before you build,
  the AI prompt. Everything launches together.
- **Self-contained.** Outside lists are used once, to fill the site before launch, and never again.
  We don't count or display sources.
- **Trust comes from people's ratings first**, plus a **Verified** tag mods give to well-known
  alternatives in the first batch. GitHub stars are shown too.
- **No stars of our own** (Oct 27). Each alternative gets a thumbs up / down instead: "does it work as
  a replacement for you?", per group, the Marketplace's Helpful / Not for me recipe. GitHub stars are
  shown for reference only; projects not on GitHub say "Not on GitHub".
- **Discussion is built into the page**, tied to GitHub accounts.
- **Closed apps are grouped.** Google Docs and Microsoft Word sit together, compared against
  LibreOffice Writer, OnlyOffice and the rest.

---

## 1. How the site is organized: groups

A **group** is one job people need done: *Documents*, *Spreadsheets*, *Notes & wikis*, *Video calls*.

- Each group lists its **closed apps** (Documents: Google Docs, Microsoft Word, Apple Pages) and its
  **open alternatives** (LibreOffice Writer, OnlyOffice Docs, …).
- **Searching a closed app takes you to its group**, with that app highlighted. If an app does several
  jobs (Notion: notes, wikis, project boards), search asks which one you mean.
- **One open project can sit in several groups.** LibreOffice appears in Documents (Writer),
  Spreadsheets (Calc) and Slides (Impress). Each group shows the part that does that job, and ratings
  are per group. Being great at spreadsheets says nothing about slides.
- **A closed app can sit in several groups too**, like Notion.

**What's rated, and where:**

| Thing | Who | Scope |
|---|---|---|
| **Thumbs up / down** on an alternative ("does it work as a replacement for you?"). Shown as a % from 5 votes up, "3 of 4" below that. A "No" moves you to the comment box | signed-in people | per alternative, per group |
| **Gap vote** ("is there a good open replacement yet? Yes, one works / Not yet") | signed-in people | per group |
| **Verified** tag ("checked by r/TrueOpenSource mods": real, open-source license, maintained, actually does the job) | mods only | per alternative, per group |
| **GitHub stars** | shown as-is, refreshed weekly | per project |
| **Owner** tag ("the people who build this wrote the pitch") | automatic when an owner tags their project | per alternative |

Alternatives are sorted by rating ("Best rated" uses a cautious score so 2 of 2 never outranks 90 of
100). Other sorts: Verified first, Most active, Newest, Most GitHub stars. Verified ones get a visible mark but aren't pinned
to the top, so ratings stay the main signal.

## 2. The discussion on each page

Built into the page in the site's own look, not an embedded GitHub widget.

- Sign in with GitHub to post. Anyone can read without signing in.
- **Where you type decides what a comment is about** (Destin, Oct 26). No menu:
  - **Each alternative card has its own comments**, opened from the card ("12 comments ▸"). The card
    shows the top comment as a preview.
  - **One group-wide discussion** below the list, for gaps and the closed apps themselves.
  - **Voting "Not yet"** opens a "What's missing?" box that posts into the group discussion.
  - **A "Latest across Documents" strip** near the top shows the newest comments from every card,
    so a small community doesn't look scattered.
- Replies one level deep, upvotes, sorted by best or newest. Edit and delete your own. Plain text with
  links, no images (less to moderate).

**Why our own instead of GitHub's discussion boards (giscus):** giscus is free and GitHub moderates it.
But it's a GitHub-styled box dropped into the page, it can't tag comments to an alternative, and it
matches pages to threads by fuzzy title search, which can attach comments to the wrong page. Building our own
costs more work up front, and gives us the page you described.

## 3. Keeping it honest (trust and abuse)

- **One GitHub account, one vote** per thing. They can be changed anytime.
- **GitHub accounts younger than 14 days** (Destin, Oct 27; was 30) can read and comment, but their
  votes aren't counted and their first comments wait for a mod. Blocks the easiest fake-account trick.
- **Rate limits** on posting and voting.
- **Report** button on every comment and listing.
- **Mod page** (only for signed-in mods): reports, held comments, tag requests, Verified tags; hide,
  restore, or ban a GitHub account from the site.
- **Owner pitches are always labeled "Owner says,"** and the checker's facts sit next to every claim.
- **Brand-new projects** (under 14 days, or failing the subreddit's checks) can still be tagged, but
  show as "New" in their own section, like the Showcase.

## 4. Tag my project

1. The owner signs in with GitHub and pastes their project's link.
2. **Ownership proof:** if the project sits under their own GitHub account, that's proof enough.
   For projects under a GitHub organization, or on Codeberg or GitLab, they add a one-line file
   we give them to the project. Only someone who controls it can do that.
3. They pick the group(s), then see **Before you build**: what's already listed there, what's reusable
   and where help is wanted. Then they answer **"What does yours do differently?"** (required).
4. They write the pitch: strengths, weaknesses, what's reusable, help wanted, and how it was built
   (the subreddit's four labels).
5. The checker runs. A mod approves it from the mod page, and it appears within minutes.
6. Owners can edit their pitch anytime, and edits are reviewed the same way.

**Showcase link:** the mod bot can reply to Showcase posts with the matching group and the same
question. It reads our public files, so this costs nothing extra.

**AI prompt:** two buttons on every group, **Copy prompt** (points the assistant at our file for that
group) and **Copy prompt with the list included** (for assistants that can't open links).

## 5. Filling it before launch (one time only)

- **Import once** from the free lists checked Oct 25: awesome-privacy (CC0), awesome-foss-alternatives
  (CC BY), switching.software (CC BY-SA), RunaCapital and btw-so (MIT), OpenAlternative (CC0),
  awesome-selfhosted (CC BY-SA). After that, our data is our own and the lists are never read again.
- **Credit stays forever.** These licenses require credit for anything copied, even once. So a
  credits page names them, and the open dataset stays CC BY-SA. That only affects the fine print, not the site.
- **Turning lists into groups:** cheap AI helpers (Haiku) propose groups and sort every project into
  them. Each one reads the project's page, records facts and flags anything unconfirmed. **Price shown
  to you before anything paid runs.**
- **You and esk check the first batch:** we confirm the groups, then give Verified tags to the
  well-known alternatives (roughly the top 3–5 per group). Everything else starts unverified.

## 6. How it's hosted

```
  Visitors' browsers
        │
        ├──► the site (pre-built pages; fast, and search engines can read them)   GitHub Pages, free
        │
        └──► the interactive parts: sign-in, votes, comments, tagging, mod page
                     │
                     ▼
             small server + database  (Cloudflare, separate from YouCoded's; free tier)
                     │  approved tags and edits are saved as files
                     ▼
             public data repository (closed apps, groups, projects, pitches, vote counts)
                     ▲
             weekly robot: refreshes GitHub stars, activity, license; flags problems to mods
```

- **Pages on GitHub Pages (free `….github.io` address); votes and comments on a small
  Cloudflare server.** GitHub Pages can only hand out fixed pages, so anything that remembers clicks
  needs the server. Because the two sit at different addresses, sign-in can't use the usual browser
  "cookie" (Safari and Firefox block those across addresses as tracking). Instead the page keeps a
  sign-in pass itself and shows it to the server with each click. Free, no web address to buy.
  - WHY this over moving everything to Cloudflare: keeps the original plan, and if the server ever
    goes down, the pages still load (just without votes and comments).
  - Safety: the pass only lets someone vote or comment as you on this site; it can't touch your GitHub.
    It expires after a few weeks, and the site loads no outside scripts that could steal it.
  - A bought web address can still be added later without breaking links.
- **Sign-in asks GitHub for nothing but who you are.** No access to anyone's code or private data.
- **What's public as open data:** the catalog, pitches, Verified tags and vote *counts*,
  refreshed nightly. **Not exported:** who voted for what, and comment text. Comments are readable on
  the site, but people can delete theirs, and a copy in a public file couldn't be deleted.
- **Backups:** the database is backed up nightly to a private place.
- **Privacy page and terms**: we store GitHub username, ID and picture only. A "delete my account and
  everything I posted" button.
- **Cost:** $0 to start (a bought web address, ~$10–15/yr, is optional and can come later). Cloudflare's free tier should cover a site this size; I'll confirm
  its limits when building. One-time AI pre-fill, priced before running.
- **Weekly robot warnings to mods:** license changed to one that isn't open source; project archived
  or deleted; no activity for 12 months (auto-tagged "Inactive", not removed).

## 7. Things to watch

1. **Empty at launch.** With few early users, ratings start empty. Cards say "No votes yet" instead of
   showing 0%, GitHub stars give a first sense of popularity, and the subreddit launch post asks members to rate their favourites.
   Verified tags carry the trust until ratings build up.
2. **A second place to moderate.** Comments here are separate from Reddit. The mod page, the 14-day
   account rule and holding first comments keep it small. Recruiting 3–5 more mods (already on the
   checklist) matters more now.
3. **Definitions on one public page:** what counts as open source (OSI license only; "open core" gets a
   tag; "source-available" licenses don't qualify), what Verified means, and the four build labels.
4. **Groups are judgment calls.** Is Notion "Notes" or "Wikis"? Mods can move things. Comments
   tagged "wrong group" go to the mod page.
5. **Build labels:** imported projects show "Not labeled" until the owner picks one. We never guess.
6. **Closed apps' logos** are trademarks: names only, no logos.
7. **The site speaks for the subreddit.** esk should agree to that, not just to co-owning it.
8. **Timing.** This is now a bigger build. The shared checker comes first because the bot needs it
   too. The rest shouldn't take mod time from the subreddit's launch.
9. **"TrueOpenSource" on GitHub is taken** by an unrelated group. Our organization needs another name.

## 8. Build order

1. **Shared checker** (also used by the mod bot).
2. **One-time import + grouping** (priced first), then you and esk check groups and add Verified tags.
3. **Design** (look = YouCoded's real parts, not an approximation: Cascadia Mono font, Light/Dark
   theme colours, Marketplace item cards, fact chips, comment list, "was this helpful"
   vote row, and a card opening a Marketplace-style detail popup; see `mockups/group-page.html`.
   Destin rejected a generic look on Oct 26). **Clickable demos built Oct 27:** `mockups/home.html`,
   `mockups/group-page.html`, `mockups/mod.html`, sharing `mockups/demo.css` (YouCoded theme, raised cards
   inside section cards, no bare text on the wallpaper). Covers: group page, home page (search, biggest gaps, best rated),
   Tag my project, mod page. You approve before building.
4. **Site** from approved designs.
5. **Server:** sign-in, ratings, gap votes, comments, reports, mod page.
6. **Tag my project, Before you build, AI prompt.**
7. **Weekly robot, nightly export, backups.**
8. **Testing**, including on phones, with you and esk as the first users. Then the launch post.
9. Later: AI review of claims, bounties, security grade.

## 9. Shared checker (done, Oct 27)

The mod bot (itsdestin/trueopensource-bot) built the checker first, so this repo copies its two files
unchanged into `checker/src/from-bot/` and adds only the site's extra facts (`checker/src/site-facts.ts`:
GitHub stars, archived, last activity, contributors, AI-credit lines). A test fails if the copies drift
from the bot's. GitLab and Codeberg are not read yet in either place; both send those to a mod.
Bulk use (the pre-fill and the weekly robot) will need GitHub's batch API to stay within its hourly limit.
