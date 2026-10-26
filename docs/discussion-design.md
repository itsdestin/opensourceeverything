---
status: draft
---
# Discussion boards: noting, voting on and resolving what's missing

Destin, Oct 27: "Replaces partly" should become a whole section. People note what's missing, vote on it and resolve it,
with different boards for different categories. This file is the thinking-through. Nothing is built yet.

## The idea in one picture

Everything people write is a **note**. Each note is attached to one place on the map, and every board is just
a filtered view of the same notes.

```
Category board: "Office"           ← every note from every Office group, sortable by votes
 └─ Group: Documents               ← notes about the job itself ("nothing does tracked changes well")
     ├─ Google Docs                ← notes comparing against one closed app ("why people leave Google Docs")
     └─ LibreOffice Writer         ← notes about one alternative ("no live co-editing")
```

An example of a note on LibreOffice Writer:

```
┌──────────────────────────────────────────────────────────────┐
│ Missing feature · vs Google Docs                     ▲ 48    │
│ No live co-editing: two people can't type in one document     │
│ Open · noted by @sam · 12 comments                           │
│                                   [Me too]  [It's fixed now]  │
└──────────────────────────────────────────────────────────────┘
```

## Questions to decide

### 1. Where the notes live

- **Today:** nothing is stored. The site is read-only.
- **Problem:** voting and resolving need somewhere to keep notes, votes and who did what.
- **Proposal:** our own small server (Cloudflare, already planned), with GitHub sign-in.
- **Options:**
  - **A. Our own server** (recommended)
    - **Pro:** notes, votes and statuses look and work exactly how we design them, on our own pages.
    - **Pro:** the 14-day account rule applies to every vote.
    - **Con:** the most to build, about a week of my work. Free to run at our size.
  - **B. GitHub Issues** (one issue per note, labels for category and status, 👍 as votes)
    - **Pro:** nothing to run, and mod tools are built in.
    - **Pro:** could launch in days.
    - **Con:** people post on GitHub, not on our page. It looks like a developer bug tracker, which scares off normal users.
    - **Con:** we can't enforce the 14-day rule on 👍.
  - **C. Reddit** (one post per note, flaired by category)
    - **Pro:** grows the subreddit. Free.
    - **Con:** nothing structured. No "fixed" status, and votes mix "agree" with "funny".
    - **Con:** the site can't show counts reliably.
  - **Middle path:** start with B to learn what people post, then move to A with the notes carried over.
    - **Con:** two systems to build, and a migration in between.

### 2. What kinds of notes there are

- **Today:** one plain line per listing ("Desktop; no live co-editing").
- **Problem:** "something's missing", "nothing does this at all" and "let's chat" need different buttons and endings.
- **Proposal:** three kinds, each with its own ending:

| Kind | Attached to | Vote means | How it ends |
|---|---|---|---|
| **Missing feature** | one alternative, optionally vs one closed app | "This matters to me" | Fixed (with a link to the release) · Won't happen · Duplicate |
| **Wish / gap** | a group (the job) | "I'd use this" | Being built (links a project) → Filled (project listed) |
| **Discussion** | anywhere | no votes, just replies | never ends; can be locked |

- **Options:**
  - **Three kinds** (recommended)
    - **Pro:** each kind shows the right buttons.
    - **Pro:** gaps get a clear path from wished, to being built, to filled. That path is the whole point of the site.
    - **Con:** the poster has to pick a kind. We can guess it from where they clicked.
  - **One kind with tags**
    - **Pro:** simpler to post.
    - **Con:** "fixed" and "being built" would sit on posts where they make no sense, so it gets messy fast.

### 3. Which boards exist

- **Proposal:** one board per **category** (Office, Creative…), filterable by group, closed app, kind and status. On top of those:
  - one **Most wanted** board across the whole site
  - a short list on each group page and project page
- **Options:**
  - **Per category + Most wanted** (recommended)
    - **Pro:** 11 boards is enough for each to feel busy.
    - **Pro:** one per group would mean 93 boards, mostly empty, and empty boards make a site look dead.
  - **Per group only**
    - **Pro:** very focused.
    - **Con:** nearly all of them empty at launch.
  - **One global board with filters**
    - **Pro:** always busy.
    - **Con:** the Office people and the developer-tool people drown each other out.

### 4. Who can mark a note resolved

- **Problem:** "It's fixed now" can be wrong, or self-serving from a project's own team.
- **Proposal:**
  - **Anyone** can click **It's fixed now**, with a link as proof. That doesn't close the note: it shows "Someone says this is fixed" and asks voters to confirm.
  - The **project's owner** (they prove it by signing in with the GitHub account that owns the repo) or a **mod** closes it immediately.
  - It also closes when **3 different people confirm** it.
- **Options:**
  - **Mods only:**
    - **Pro:** safest.
    - **Con:** you and esk become the bottleneck.
  - **The mix above** (recommended):
    - **Pro:** fast.
    - **Pro:** owners have a reason to show up, which is good for the site.
    - **Con:** an owner could close a note that isn't really fixed. Anyone can reopen it, and a mod has the last word.
  - **Pure votes:**
    - **Con:** easy to game with friends' accounts.

### 5. What a vote is

- **Proposal:** one **Me too** button (no downvote) on missing features and wishes, one per account, counted only from GitHub accounts at least 14 days old. A post can be **reported** but not downvoted.
  - **Pro:** simple, friendly, and hard to pile on with.
  - **Con:** no way to say "this doesn't matter". Old notes with few votes just sink, which works out the same.
- **Separate from this:** the 👍/👎 on each alternative ("is this a good replacement?") stays as planned.

### 6. Should notes change "Replaces fully / partly"?

- **Today:** a person or the AI set the fit by hand.
- **Proposal:** **not automatically.** When a missing feature passes **25 votes**, mods get a prompt: "Should LibreOffice Writer be 'partly' for Google Docs?" A mod decides.
- **Options:**
  - **Prompt mods** (recommended):
    - **Pro:** votes inform the label without anyone being able to game it.
  - **Automatic**:
    - **Pro:** no mod work.
    - **Con:** a brigade could demote a good project overnight.
  - **Never linked**:
    - **Con:** the notes and the label drift apart, and the label stops meaning anything.

## What visitors would see

- **Group page:** a "What's missing" section under the alternatives: the top 5 open notes, then "See all on the Office board".
- **Alternative cards:** a small chip, "3 missing features", that opens that project's notes.
- **Gaps page:** each gap shows its top wish and its vote count. "Being built" links to the project.
- **Builders:** a "Most wanted" list per category tells them what to build next. It feeds the gaps page too.

## Risks to plan for

- **Empty boards at launch.** Seed every category from what we already have: 141 listings are "partly", and the AI review wrote a reason for each. Those become notes marked as written by the map. Then nothing starts empty.
- **Spam and self-promotion.** First posts from new accounts wait for a mod. Projects posting "use mine instead" get a "Disclosed: posted by the project's team" chip, not a ban.
- **Mod load.** Two mods can't read everything. Reports and the "someone says it's fixed" queue go on the mod page, worst first.
