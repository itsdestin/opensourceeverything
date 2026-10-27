---
status: draft
---
# Who the site is for, and what happens to the "What's missing" boards (Oct 27, 2026)

Destin asked (feature-tags deck, question F-boards): "want to think through the various use cases of this
application/site further and where users would find most utility. want proposals with pros/cons."

This file assumes the **feature checklists** ("feature tags": a yes / partly / no per item, per project, per group)
are being designed in parallel and will exist. Nothing here is built. Effort is given as small / medium / large
relative to the rest of the site, not in days, because past estimates were far too high.

---

## The short answer

- **Most visitors come for one thing: "I use Google Docs. What do I switch to, and will it work for me?"** They
  arrive from a search engine or an AI assistant, read one page, and leave. They almost never post. Most of them
  don't have a GitHub account, and posting on the site needs one.
- **Once feature checklists exist, they will answer most of what the free-text boards were meant to hold.** Of the 13
  starting notes posted under Destin's name, 12 are really checklist items ("Live co-editing", "Opens Word files
  exactly", "Opens Photoshop files", "Edits text inside PDFs") or a fact the site already has ("Easy setup").
- **What free text is still uniquely good for** is first-hand experience ("I moved my family to Immich; here's what
  broke"), how-to tips for moving your stuff over, and news ("this project just changed its license"). Those are
  valuable, but they are also exactly what Reddit already does well, and Reddit is where those people already are.
- **Recommendation:** remove the free-floating boards. Keep free text only where it hangs off something structured
  (a thumbs-down, a "this checklist answer is wrong", a request for a new checklist item). Send open conversation to
  r/TrueOpenSource with a link from every group. Later, once there is traffic, add **Switching stories**: a short,
  mostly tick-box report of how a switch went, which feeds the rankings and "people who left X went to Y".
  Details and a phased path are in section 3.

---

## 1. Who comes to the site, and what they need

Ranked by how many people are likely to come (most first). A second ranking, by value to the mission, is at the end.

### 1.1 The switcher: "I want to leave this closed app"

- **Who:** an ordinary person. Fed up with a subscription (Adobe, Microsoft 365), worried about privacy (Google
  Photos), or pushed out (an app shut down or raised its price). Often not technical.
- **How they arrive:** a search engine, for "open source alternative to Notion" or "free Photoshop alternative". They
  land on a closed-app page or a group page, not the home page.
- **What they come for:** one good pick, fast, and confidence it will work for them.
- **What they need on the page:**
  - The top pick, with one plain reason why it's first.
  - Does it run on my devices (iPhone, Windows, Chromebook)?
  - Is it easy to set up, or does it need a server?
  - Does it do the things I actually use (the checklist)?
  - Will my files come with me (can it open my .docx, .psd)?
  - How do I move my stuff over (export from the old app, import into the new one)?
  - Is it free, and is there a hosted version so I don't have to run anything?
- **Success:** they install one and keep using it. Today we would never know, which is a problem in itself (see
  Switching stories).
- **Served today / planned:** closed-app pages, best-match ordering with a "why it's first" line, device filter, Easy
  / Advanced setup, "Help me choose" prompt, thumbs up / down, Verified, feature checklists (planned).
- **Missing:** how to move your files and data over (export / import steps), a plain "what you'll lose" summary per
  closed app, and any way to hear from people who already made the same switch.
- **Do they post?** Rarely. They don't have GitHub accounts, and they leave once they have their answer. The best
  thing they could give back is a single tap ("Did you switch? Yes, to X") or a short story later.

### 1.2 The person whose AI assistant does the looking

- **Who:** the same kind of switcher, but they ask ChatGPT, Claude or a local assistant "help me get off Google
  Photos" and the assistant reads our site (`llms.txt`, the per-group data files, the copy-able prompts).
- **What they come for:** the assistant needs complete, current facts it can compare: devices, setup, checklist
  answers, license, active or abandoned, file formats.
- **What they need:** data files that include everything a person would see (the review found the group files leave
  out devices, stars, Verified and inactive), a version number, and, as Destin said in the review deck, "better tooling
  for agentic access to our database" rather than our own AI search.
- **Success:** the assistant recommends something right for this person, and says where it got that.
- **Served today / planned:** `llms.txt`, per-group files, "Copy prompt", "Help me choose" prompt; an AI connector
  (MCP) is on the "later" list.
- **Missing:** checklist answers and setup level in the files; use-case prompts ("move my family off Google");
  the connector.
- **This group may soon outnumber direct visitors.** Every request from an assistant is a person helped who never
  sees the page, so structured, exportable data is worth more than anything written in a comment box (comment text
  is deliberately not exported, so assistants can't see it).

### 1.3 The builder about to start a new project

- **Who:** often a vibecoder or someone with an AI coding tool, sometimes an experienced developer. They have an
  idea ("an open Canva") and are about to start. This is the subreddit's core audience and the reason the site exists.
- **What they come for:** "does this already exist, and if so where could my work go instead?"
- **What they need:** what already exists in this job, what each one is missing (the checklist), which features are
  missing **everywhere** (a real niche worth a new project), which projects accept plugins or extensions, which accept
  AI-assisted help, and who is already building the thing.
- **Success:** they either join or extend an existing project, or start something new knowing it fills a real gap. Both
  are fine. The site's line is "see what exists first", never "don't build that".
- **Served today / planned:** "Before you build" prompt, gaps page, Most requested, "How to help" links, AI-contribution
  labels (being redesigned), the "I'm building this" claim on wishes (built into the notes server already).
- **Missing:** a "Missing everywhere" list per group fed by the checklist, a clear "someone's already building this"
  marker on gaps, and plugin docs shown next to the specific missing feature ("Build templates as a Penpot plugin").

### 1.4 The contributor looking for somewhere to help (including vibecoders)

- **Who:** wants to give time to open source but doesn't know where. Includes non-coders (translation, docs,
  design, testing) and people with AI tools.
- **What they come for:** "where is help actually wanted, by people who'll welcome mine?"
- **What they need:** a list of concrete tasks across projects, filterable by kind of help, beginner-friendly or not,
  and the project's rule on AI-assisted help, before they show up.
- **Success:** a contribution that gets accepted, without annoying a maintainer (the launch-post warning from
  fairwaycoder).
- **Served today / planned:** "How to help" (plugin docs, beginner and help-wanted task counts, contributing guide);
  AI-contribution labels.
- **Missing:** one place that gathers all of this across the map ("Help wanted, by what you can do"), and non-code
  ways to help, including helping **this site** (writing a switch guide, checking a checklist).

### 1.5 The project maintainer

- **Who:** runs one of the listed projects. Small in number, but each one can fix many answers at once.
- **What they come for:** to see how their project is shown, correct it, and attract users and helpers.
- **What they need:** claim the page, correct the checklist and facts, write the "From the Developer" pitch, state
  their contribution rules, and see what people are asking for in their project's group.
- **Success:** their page is accurate, they get users and good helpers, and they aren't flooded with bad ones.
- **Served today / planned:** Tag my project, "From the Developer" pitch, the temporary "drafted with AI
  assistance" banner that disappears once claimed, setting their own AI-contribution label.
- **Missing:** a simple "your project" view: what visitors dispute, which missing items in their group they could
  own, and what's changed.
- **Discussion matters to them in one way:** they want to be able to answer "this is wrong" or "this is fixed now"
  with a link. They don't want to moderate a second comment section about their project.

### 1.6 The researcher, journalist or analyst

- **Who:** writing about open source, digital sovereignty, or the AI-and-duplication debate.
- **What they come for:** counts and trends. "How many jobs have no open replacement?" "What do people want most?"
- **What they need:** the open dataset (already public, CC BY-SA), a stable gaps list, Most requested, and checklist
  totals ("no open app does live co-editing on phones").
- **Success:** they cite the site. That brings traffic and builders.
- **Served:** open data files, gaps page, Most requested. **Missing:** a simple "numbers" page and date-stamped
  snapshots.

### 1.7 The subreddit mod (Destin, esk, future mods)

- **What they come for:** keeping the map accurate with the least time.
- **What they need:** one queue, worst first, with one-click actions.
- **The key fact for this decision:** two mods already moderate Reddit. Every on-site comment box is a second place
  to moderate. The current server already holds first posts from new accounts, takes reports, and has a mod page, so
  the tools exist; the time is the cost.

### Ranking

| User | Likely traffic | Value to the mission | Do they write free text? |
|---|---|---|---|
| Switcher | Highest | High: they are why builders should care | Rarely; most can't (no GitHub) |
| Person via an AI assistant | High and growing | High: multiplies reach | Never; they read data files only |
| Builder about to start | Medium | **Highest**: this is the anti-duplication mission | Sometimes: "I'm building this" |
| Contributor | Low to medium | Very high | Rarely |
| Maintainer | Low | Very high: fixes data at the source | Short corrections, pitches |
| Researcher / journalist | Low | Medium: brings attention | No |
| Mod | Tiny | Enabler | Answers, decisions |

**Takeaway:** the two biggest groups don't write, and one of them can't see comments at all. The groups that do
write (builders, maintainers) mostly want to say short, structured things: "I'm building this", "this is fixed now",
"this answer is wrong".

---

## 2. Where people's words help, and where ticks and votes do it better

### 2.1 Per user type

| User | What community input helps them | Best done as a tick, vote or form | Best done as free text |
|---|---|---|---|
| Switcher | "Did it work for people like me?" | Thumbs up / down; checklist answers; "Did you switch? To what?" | "Here's what broke when I moved my family"; tips for moving files |
| AI-assisted person | Facts it can compare | Everything structured (only structured data is exported) | Nothing (comments aren't in the files) |
| Builder | "What's really missing, and who's on it?" | Checklist "Missing everywhere"; "I want this too"; "I'm building this" with a link | A proposal for something the checklist doesn't cover yet |
| Contributor | "Where am I welcome?" | Help-wanted counts; AI-contribution labels | Rarely needed |
| Maintainer | "What do people think we lack?" | Disputes on checklist answers, with links | A reply: "fixed in 4.2, here's the release" |
| Researcher | Trends | Votes and counts | Quotes from switching stories (on Reddit, these are public already) |
| Mod | Less to read | Structured queues | As little as possible |

### 2.2 What free text is uniquely good for

1. **Experience reports.** "I switched my family of five from Google Photos to Immich. Face search is great; sharing
   an album with Grandma was hard." No checklist captures the texture of this, and it is the most persuasive thing a
   hesitant switcher can read.
2. **Moving-over tips.** "Export from Notion as Markdown and HTML, then import the HTML into AFFiNE; tables survive,
   databases don't." This is very valuable, but it is really a **guide**, and is better written once and kept up to
   date than scattered across comments (see 4.1).
3. **News and warnings.** "This project's company just changed the license", "the main developer stepped away, is it
   still maintained?" Time-sensitive; the weekly robot catches some of it (archived, license changed, no activity),
   people catch the rest.
4. **Things that aren't features.** Pricing changes, community tone, company trust, accessibility, "the iPhone app
   exists but is awful". The deck's own con for dropping the boards.
5. **Proposals for something nobody has listed.** "None of the Documents checklist items covers tracked changes."
   This is the seed of a new checklist item.
6. **Questions.** "Does this work with a Kindle?" Real, but Reddit and the projects' own forums answer these far better
   than a small site can.

### 2.3 What free text costs here

- **The sign-in wall.** Posting needs a GitHub account. Most switchers (the people with the best experience reports)
  don't have one, and Destin chose to keep GitHub as the only route. So on-site free text will come mostly from
  developers, which skews what the site says about consumer apps.
- **Empty at launch.** 123 groups. A "What's missing" section that says "Nothing noted yet" on almost every page makes
  the site look abandoned, and seeding fake-looking posts already hurt trust once (the review's section 1).
- **Duplication.** The same complaint worded ten ways. The checklist fixes this for features; free text brings it back.
- **Spam and self-promotion.** "Use my project instead" under every competitor. The server already labels and holds
  these, but someone has to read them.
- **A second place to moderate.** Two mods, two places. Reddit already has spam filters, mod tools, karma and a habit of
  people reporting bad posts; our site has a hand-built queue.
- **It never reaches AI assistants.** Comment text is deliberately not exported (people must be able to delete what they
  wrote), so the fastest-growing audience never sees it.
- **Tension with the subreddit.** If the good conversations happen on the site, the subreddit is quieter, and the
  subreddit is what gives the site its name and trust.

### 2.4 What structured input is better at

- It **adds up**: 40 "No" answers on "Live co-editing" become a clear signal; 40 comments don't.
- It **feeds the ranking and the gaps page directly**, with no mod reading every line.
- It's **exportable** to AI assistants and researchers.
- It's **hard to misuse**: one vote per account, 14-day rule, no room for an argument.
- It **looks fine empty**: an AI-drafted checklist answer, or "No votes yet", reads as normal; an empty comment box
  doesn't.

---

## 3. Proposals for the boards

What exists today on the server (checked in `worker/src/`): notes of three kinds (**Missing feature**, **Wish**,
**Discussion**), "Me too" votes, one level of replies, "It's fixed now" with a link and three confirmations to close,
"I'm building this" with a link on wishes, reports, a mod queue, and a prompt to mods when a missing feature passes
25 votes ("should this be 'partly'?"). Pages: `boards/` (Most wanted), one board per category, a "What's missing"
section on every group page and project page. 13 starting notes under Destin's name are written but not run.

Each proposal below says what happens to that.

### Proposal A: Notes become proposals for new checklist items, plus a light discussion

- **How it works:**
  - "Missing feature" notes go away; checklist answers replace them. If an answer is wrong, you tap "This isn't right"
    and add a link. Three confirmations or a mod flip it (the existing "It's fixed now" machinery, reused).
  - A new note kind, **"Suggest a checklist item"** ("Tracked changes" for Documents). "Me too" votes on it count as "I
    want this". When a mod adds the item, the votes carry over and every project gets an AI-drafted answer.
  - "Wish" notes stay as group-level gaps ("A voice assistant as good as Alexa") with "I'm building this".
  - "Discussion" stays, but only on the group page, collapsed under "Talk about this group".
- **Serves:** builders (clear proposals, who's building what), maintainers (a dispute with a link they can answer),
  mods (votes tell them which items to add).
- **Pros:**
  - No duplicates: people vote on one item instead of rewording it.
  - Reuses almost all the server code already written.
  - Keeps a place for things that aren't features.
- **Cons:**
  - "Suggest a checklist item" is a new idea people have to learn.
  - The discussion part keeps every cost in 2.3, for the smallest benefit.
  - Still GitHub-only, so switchers' voices are missing.
- **Mod cost:** medium. Proposals are few and easy; disputes are frequent at first (AI-drafted answers will be wrong
  in places); discussion is the open-ended part.
- **Empty at launch:** checklists are full on day one, so pages look complete. "Suggest a checklist item" can start
  empty without looking dead, because it's a button, not a list. Discussion shows "Nothing yet", which looks dead.
- **Effort:** small to medium (mostly relabelling existing kinds and wiring votes to checklist items).

### Proposal B: Replace the boards with "Switching stories"

- **How it works:** one format, attached to a group: "I switched from **[closed app]** to **[open app]**". Mostly taps:
  - Still using it? Yes / Went back / Mixed.
  - Who for: Just me / Family / Team or work.
  - What didn't come over or didn't work: pick from that group's checklist items (no typing needed).
  - Setup: Easier than expected / As expected / Harder.
  - One optional short paragraph of tips (500 characters).
  - Group pages show "12 people switched from Google Photos to Immich · 10 still use it", the most helpful stories,
    and the most-named "what didn't work" items.
- **Serves:** switchers most of all (the one input that speaks directly to "will it work for me"), builders (real
  reasons people go back), and the planned "people who left X went to Y".
- **Pros:**
  - Each story feeds the ranking, the checklist and "people who left X went to Y" at once.
  - The tick-box parts can be exported to AI assistants, even if the paragraph isn't.
  - Far less to moderate than open discussion: one short paragraph, no replies.
  - Persuasive in a way stars and checklists aren't.
- **Cons:**
  - Switchers who'd write these mostly lack GitHub accounts. Without another way to sign in (Reddit sign-in, or a
    held-for-mod anonymous form, which Destin turned down for suggestions), stories will trickle in slowly.
  - Self-promotion risk: a project's team posting glowing stories. Same 14-day rule and "Disclosed" label as today.
  - Nowhere for proposals or questions, unless combined with A or C.
- **Mod cost:** low to medium (short texts; the ticks need no reading).
- **Empty at launch:** looks empty for months. Must be hidden until a group has, say, 3 stories, with a quiet "Switched
  from Google Docs? Tell people how it went" button instead.
- **Effort:** medium (new form, new totals on the group page; the storage and votes already exist).

### Proposal C: Conversation lives on Reddit; the site keeps only structured input

- **How it works:**
  - The site keeps checklists, disputes, thumbs, gap votes, "I want this too", "I'm building this" and Tag my project.
  - Every group page gets a **"Talk about this on r/TrueOpenSource"** button. The first click on a group with no thread
    asks the subreddit bot (it already exists) to post one ("Documents: switching from Google Docs and Word"); after
    that, the button opens the same thread and shows how many comments it has.
  - Optional, if Reddit's rules allow it: show the 2–3 top comments on the group page as a read-only quote with a link.
    This needs checking first. Reddit restricted how its data can be reused in 2023, and its official embed loads an
    outside script, which the site rules out. **Safe fallback: link and comment count only.**
  - The bot can also post a **weekly "What changed on the map"** thread (new projects, checklist answers that flipped,
    gaps filled), which gives the subreddit regular content.
- **Serves:** switchers (Reddit accounts are far more common than GitHub ones), the subreddit itself, mods (one place
  to moderate).
- **Pros:**
  - One place to moderate, with Reddit's spam filters and voting already working.
  - Grows the subreddit instead of competing with it.
  - Normal people can take part with an account they likely already have.
  - Nothing looks empty on the site: it's a button, not a list.
- **Cons:**
  - Conversation is off the page; many visitors won't click through.
  - Reddit's votes mix "agree" and "funny"; nothing structured comes back to the site.
  - 123 possible threads. Created only on demand, most groups will never get one, which is fine, but popular ones will
    need occasional new threads (Reddit archives old posts after six months; they can be unarchived per subreddit).
  - Depends on Reddit staying usable and friendly to bots.
  - Reverses Destin's Oct 26 call that "discussion is built into the page". That call came before checklists existed.
- **Mod cost:** lowest of the options that keep conversation (it's moderation the mods already do).
- **Empty at launch:** fine.
- **Effort:** small (a link and a bot command); medium if showing top comments turns out to be allowed.

### Proposal D: No discussion at all, only structured signals

- **How it works:** remove notes, replies, boards and the "What's missing" sections. Keep checklists with "This isn't
  right" disputes (link required, no free text), thumbs, gap votes, "I want this too", "I'm building this", and
  "Suggest a checklist item" as a GitHub form (like every other suggestion today).
- **Serves:** AI-assisted visitors, researchers, mods.
- **Pros:**
  - Simplest page and the smallest moderation load.
  - Everything people give back is exportable and adds up.
  - Nothing can look empty or fake.
- **Cons:**
  - Loses experience reports, news and non-feature complaints entirely.
  - The site feels like a catalogue, not a community, which is weaker for a site that speaks for a subreddit.
  - Maintainers can't reply to a dispute in words, only with a link.
  - Throws away server work already done.
- **Mod cost:** lowest.
- **Empty at launch:** fine.
- **Effort:** small (mostly removing things).

### Proposal E (new): Words only where they're attached to an action

- **How it works:** there is no standalone "Add a note" button and no category boards. Instead, every structured action
  has an optional short "why" box, and those are the only free text on the site:
  - Thumbs down on an alternative → "What stopped you?" (tick checklist items, plus one optional line).
  - "This checklist answer isn't right" → a required link, plus one optional line ("Fixed in 4.2").
  - "Suggest a checklist item" → its name, plus one line on why it matters.
  - "I want this too" on a gap → "What would you use it for?" (optional one line).
  - "I'm building this" → a link, plus one line on how it's different.
  - The category boards become a read-only **"What people are saying"** feed of these lines, and the group page shows
    the top few under each item they belong to (under the checklist row, under the gap), never as a separate pile.
  - Open conversation goes to Reddit, as in C.
- **Serves:** everyone a little; builders and maintainers most (every line is about something specific).
- **Pros:**
  - Every comment is tied to something that counts, so it can't drift into an argument with no subject.
  - Short lines (say 200 characters) are quick to moderate.
  - Lines appear where they're useful ("No live co-editing: 'We tried it for a school group project; we had to fall
    back to emailing files'") instead of on a board nobody visits.
  - Looks fine empty: a checklist row with no comments is just a checklist row.
- **Cons:**
  - No room for longer stories (unless B is added later).
  - Still GitHub-only to post.
  - More small boxes to design well so they don't clutter cards (Destin already said the cards are too busy, so the lines
    belong in the details pop-up, not on the card).
- **Mod cost:** low to medium.
- **Empty at launch:** fine.
- **Effort:** medium (attaching short lines to existing actions; most storage exists; the boards become a read-only
  feed).

### Side-by-side

| | A. Proposals + light talk | B. Switching stories | C. Reddit for talk | D. Nothing | E. Words on actions |
|---|---|---|---|---|---|
| Helps switchers | A little | **Most** | Some (they can post) | Least | Some |
| Helps builders | **Most** | Some | A little | Some | **Most** |
| Helps maintainers | Some | A little | A little | A little | **Most** |
| Reaches AI assistants | Partly | Ticks yes | No | Yes | Ticks yes |
| Mod time | Medium | Low–medium | **Lowest with talk** | Lowest | Low–medium |
| Looks fine empty | Partly | No (hide until 3) | Yes | Yes | Yes |
| Grows the subreddit | No | No | **Yes** | No | Yes (with C) |
| Effort | Small–medium | Medium | Small | Small | Medium |

### Recommendation: E + C now, B later

1. **Now, at launch (E + C):**
   - Turn "Missing feature" notes into checklist disputes, and the 13 starting notes into checklist answers and
     gaps (12 of them fit; "A voice assistant as good as Alexa" stays a gap, "A setup anyone can do" is already Easy
     setup). This also settles Destin's earlier concern about "missing in most things" versus "missing in this app":
     the checklist shows both at once.
   - Add "Suggest a checklist item" (Proposal A's best part), with votes that carry over.
   - Keep "Wish" as gaps with "I want this too" and "I'm building this".
   - Remove the "Discussion" kind, the "Add a note" buttons and the category boards; replace the boards with the
     read-only "What people are saying" feed and the site-wide Most wanted list.
   - Add "Talk about this on r/TrueOpenSource" on every group page, created on demand by the bot, link and count only.
2. **Next (once there are real visitors):**
   - The bot's weekly "What changed on the map" thread.
   - Check Reddit's rules on showing top comments read-only; add it only if clearly allowed.
3. **Later (once a few groups have steady traffic):**
   - Switching stories (B), hidden on a group until it has 3. Before building it, decide whether to add a second way
     to sign in (Reddit sign-in, for example), because without one most real switchers can't take part.

**Why this over A on its own (the deck's original recommendation):** A keeps open discussion on the site, which carries
every cost in 2.3 for the smallest group of users. E keeps A's best part (proposals with votes) and gives every comment
a subject.

**Why not D:** it loses news, maintainers' replies and any sense of community, and E costs only a little more.

**What changes for visitors (intended and not):**
- Group pages get shorter: no "What's missing" pile; short lines appear under checklist rows and gaps instead.
- The "Boards" link in the menu becomes "Most wanted" (or goes away). Anyone who bookmarked a category board should be
  sent to that category's Most wanted view, not to a missing page.
- People who wanted to ask a question on the site are sent to Reddit. Some won't bother; that's the main loss.
- Destin's earlier call ("discussion built into the page") is reversed for open conversation. Short, specific comments
  stay on the page.
- Any notes real people have already posted (none yet, since the server isn't live) would need converting by hand.

---

## 4. Ideas that would raise usefulness the most

Ranked by how much they help the biggest and most mission-critical groups.

### 4.1 Switch guides on every closed-app page (switchers; also AI assistants)

A short, structured "Leaving Google Docs" box: how to export your stuff (a link to Google Takeout), which open apps
can open it, what won't come over (comment history, version history), and whether phone apps exist.

- Mostly the same few fields per closed app, AI-drafted and marked like the rest of the listing, then corrected by
  people.
- Closed-app pages are where search engines send people, so this is the single biggest gain for the biggest group.
- "Help me choose" and the data files should include it, so assistants can walk someone through the move.
- A contributor who isn't a programmer can check or improve one, which gives the site a way for normal people to help.

### 4.2 "Works with your files" (switchers, builders)

Which file types each project opens and saves (.docx, .xlsx, .psd, .dwg, .pdf) and how well (yes / partly / no). This
is probably the most common real worry ("can I still open what people send me?"). **This is a note for the feature-tag
design**: file formats are checklist items that repeat across many groups and could be written once.

### 4.3 Use-case prompts and a connector for AI assistants (people via AI)

Destin's own direction (review deck): better ways for assistants to use the data instead of our own AI search.

- Ready-made prompts for common situations, not just per group: "Move my family off Google", "Replace Microsoft 365
  for a small charity", "Stop paying Adobe".
- Put the checklist answers, setup level, devices, file formats and switch guides into the data files.
- The AI connector (MCP) so an assistant can ask the map directly.

### 4.4 "Missing everywhere" plus "how to build it" (builders, contributors)

The checklist shows which items no project in a group has. Next to each one: who has said "I'm building this", which
projects accept plugins for it (the "Build it as a Penpot plugin" idea from the launch post), and their AI-help rule.
This is the clearest answer to "should I start a new project?"

### 4.5 One "Help wanted" page across the map (contributors, vibecoders)

Gather each project's beginner and help-wanted tasks (the robot already counts them), filterable by kind of help (code,
translation, design, documentation, testing) and by AI-help rule. Include helping this site (checking a checklist,
writing a switch guide). Matches the fairwaycoder warning by sending people to tasks maintainers set aside for
newcomers.

### 4.6 Switch kits (switchers; shareable on Reddit)

Curated bundles for a whole move: "Leave Google", "Leave Adobe", "Leave Microsoft 365", "A privacy setup for your
parents". Each is a short list of groups with the top pick in each. Mods write a handful; they're easy to share and
good for search engines.

### 4.7 Watch a gap or a project (builders, switchers)

"Tell me when something fills this gap" or "when this project gets live co-editing". The site stores no email
addresses, so the least-invasive ways are:
- A news feed (RSS) per group, which needs no account and stores nothing.
- The weekly "What changed on the map" Reddit thread (Proposal C), which people can follow there.
- A GitHub notification would need more access to people's accounts than the site asks for today, so it's not
  recommended.

### 4.8 A "your project" view for maintainers (maintainers)

After claiming: disputed answers to review, gap items in their group they could take on, the "I want this" counts
that touch their project, and a reminder when the robot sees their contributing rules change. Gives maintainers a
reason to claim the page, which is what removes the "drafted with AI assistance" banner.

### 4.9 A one-tap "Did you switch?" (switchers; feeds everything)

Before full Switching stories: a single question on group pages, "Did you switch from Google Docs? To which one?"
It feeds "people who left X went to Y" with almost no moderation. Still needs sign-in, so it shares the GitHub
problem, but it's a far smaller ask than writing a story.

---

## 5. Decisions only Destin can make

Three questions, so they stay here rather than on a deck.

1. **Boards:** go with E + C now and Switching stories later (recommended), or one of A–D?
2. **Reddit as the home for open conversation:** OK to reverse the Oct 26 "discussion built into the page" call for
   open conversation, keeping only short, specific comments on the site?
3. **A second way to sign in** (for example with a Reddit account), only when Switching stories are built? Pro: the
   people with the best experience reports could take part. Con: a second account system to keep safe, and Reddit's
   rules for sign-in need checking first.
