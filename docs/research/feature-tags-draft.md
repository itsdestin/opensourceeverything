---
status: draft
---
# Feature checklists ("feature tags"): starter design (Oct 26, 2026)

You asked (feature-tags deck, question F-build) for one careful pass on "the most useful starter tags for each
category, and how these relate to what's-missing labels". This is that pass. Nothing here is built.

- **The full list** (every item's wording, and the checklist for all 123 groups) is in
  `feature-tags-draft.json` next to this file. This page explains it and works seven groups through in full.
- **Your decisions this follows** (deck, Oct 26): yes / partly / no per item, with a short note for "partly";
  answers filled in at the start without an AI label; signed-in users confirm or dispute and mods decide; shown as a
  "Must have" dropdown that lets you pick several, a compare table, a fold-out section on each card (not chips on the
  card), and "Missing everywhere" on the gaps page.
- **Companion file:** `use-cases-and-discussion.md` (same folder) answers your F-boards question (what happens to the
  free-text boards) with options and pros and cons. This page doesn't repeat that. Section 3 below says how
  checklists plug into whichever option you pick.

---

## The numbers

| | |
|---|---|
| Groups with a checklist | 123 of 123 |
| Items per group | 4 to 8, average 5.75 |
| Items in the whole library | 435 |
| Shared items (used in 2 or more groups) | 51 |
| Items used in one group only | 384 |
| Answers to fill in | about 3,000 (one per project per item) |
| Of those, with a starting answer from data we already have (devices) | about 350 |

Most-used shared items: **No server needed** (45 groups), **Phone app** (43), **Hosted for you** (31, the
business and developer version of "no server needed"), **Quick to run yourself** (15), **Nothing locked behind a
paid version** (14), **Works offline** (11), **End-to-end encrypted** (11).

A library of 435 sounds big, but nobody ever sees it whole. A visitor sees one group's 6. A mod sees one group's 6.
Most items are specific to one kind of app on purpose ("Opens Word files faithfully" only makes sense in Documents).

---

## 1. What makes a good checklist item

### The tests every item passed

1. **It changes someone's choice.** It's something a person leaving the closed app checks before switching, or
   regrets after. "Live co-editing" passes for Google Docs users. "Has a spell checker" fails: every option has one.
2. **It splits the field, or it's a real gap.** If every project says yes, the item can't help anyone choose, so it
   isn't on the list ("Exports to PDF" in Documents). The one exception: if every project says **no**, it stays,
   because that is exactly what the gaps page is for ("Live traffic" in Maps).
3. **It can be checked from the project's own website or docs.** "Easy to learn", "polished" and "fast" fail: they
   are opinions and would start arguments. "Runs on an ordinary graphics card (8 GB)" passes: there's a number.
4. **Plain words.** No "WYSIWYG", "CRDT", "OIDC". When a technical term is unavoidable it goes in brackets after the
   plain words: "Company sign-in (SSO)".
5. **Yes is the good answer.** "No phone number needed", not "Requires a phone number". This keeps the filter simple:
   ticking an item always means "I want this".
6. **One question per item.** "Imports and exports" would be two items. A "partly" on a double question can't be
   read.
7. **It means the same thing everywhere it appears.** "Phone app" means "apps for both iPhone and Android" in every
   group. That's what lets a project answer once, and it's why items naming a closed app are kept to one group
   ("Imports from Notion or Evernote" is a Notes item, not a shared "Imports from the closed app" item, because
   OnlyOffice is in three groups and would need three different answers).

### How many per group

- **4 to 8.** Fewer than 4 doesn't help anyone choose. More than 8 becomes a spec sheet that nobody reads on a phone.
- Small groups (1 or 2 projects, like Translation or Infrastructure as code) get 4 or 5. Big, varied groups
  (Notes with 26 projects, Password managers, Server monitoring) get 7 or 8.
- **Order matters.** The first item in each list is the one switchers ask about most. The first 3 are what shows
  when a card's fold-out is closed on a phone, and what the "Must have" dropdown lists first.

### Shared items vs one-group items

- **Shared items** cover the questions that come up across many kinds of apps: devices (Phone app; Windows, Mac and
  Linux app; Tablet app; Works in a web browser), setup (No server needed; Hosted for you; Quick to run yourself;
  No commands needed), privacy (End-to-end encrypted; No tracking by default; No account needed), working together
  (Live co-editing; Share with family or team; Company sign-in), money (Nothing locked behind a paid version), and a
  few families (fediverse, AI, databases).
- **One-group items** carry what's special about each job: file compatibility with the closed app (Word, Excel,
  PowerPoint, Photoshop, Illustrator, InDesign, AutoCAD files), the signature feature people miss (Notion's databases,
  Loom's instant share link, CapCut's templates, Lightroom's photo library, YNAB's envelope budgeting), and how to
  move in (Imports from Slack / Trello / Google Photos / 1Password / Postman / Shopify / Mailchimp…).
- **Two shared items get a starting answer from data the site already has.** "Phone app" and "Windows, Mac and
  Linux app" start from each project's device list; "Works in a web browser" too. The fill run only confirms them.
  This avoids two places on the page disagreeing about devices.

### Naming rules

- 2 to 5 words, starting with the thing, not a verb when possible: "Live traffic", "Shared albums".
- Say the closed app's name when that's how people think: "Opens Photoshop files", "Imports from Slack".
- Each item also has a **question** (shown when you tap it, and used by the filling robot) and a **meaning**
  sentence saying what yes, partly and no each mean. The meaning sentence is what stops two people answering the same
  project differently.

### What switchers from each kind of closed app actually miss (and so led the lists)

| Leaving | The thing they miss most | Item |
|---|---|---|
| Google Docs | Two people typing at once | Live co-editing |
| Word / Excel / PowerPoint | Files from colleagues looking the same | Opens Word / Excel / PowerPoint files faithfully; Runs Excel macros |
| Photoshop | Changing an edit later; PSDs from others | Non-destructive editing; Opens Photoshop files |
| Lightroom | Sorting thousands of photos | Photo library |
| Procreate | It's an iPad app | Tablet app |
| Netflix / Spotify | Something to watch or hear without your own files | Shows and movies to watch; Millions of songs to stream |
| Google Maps | Traffic, transit, opening hours | Live traffic; Public transport directions; Opening hours |
| Google Photos | Phone backs up by itself; finding faces | Backs up your phone automatically; Finds faces |
| WhatsApp | Not handing over a phone number (privacy users) | No phone number needed |
| Zoom | Big meetings | Smooth with 50+ people |
| Loom | The share link appears when you stop recording | Instant share link |
| CapCut | Captions and templates in one tap | Automatic captions; Ready-made templates |
| Slack / Teams | Bringing the history | Imports from Slack |
| Android | Banking apps | Banking and wallet apps work |
| Chrome | uBlock Origin was cut back in Chrome | Full ad-blocking extensions |
| Datadog | Metrics, logs and traces in one place | Metrics; Logs; Traces (three items, because projects split on them) |
| Shopify | A shop front, not a toolkit | Ready-made shop front |
| Any open-core product | The good bits are paid | Nothing locked behind a paid version |

---

## 2. Seven groups worked through

The answers below are **my expectation from what I know of these projects**. They show how the checklist would
read; they are not checked. The fill run (section 4) checks every one against the project's own docs.
Y = yes, ~ = partly, N = no.

### Documents (replaces Google Docs, Word, Pages)

| | Live co-editing | Opens Word files faithfully | Comments and suggested edits | Works offline | No server needed | Phone app |
|---|---|---|---|---|---|---|
| LibreOffice Writer | N | ~ | Y | Y | Y | ~ |
| OnlyOffice Docs | Y | Y | Y | Y (desktop app) | Y | Y |
| Collabora Online | Y | ~ | Y | N | ~ | Y |
| CryptPad | Y | ~ | ~ | N | Y | N |
| Etherpad | Y | N | ~ | N | ~ | N |
| Apache OpenOffice | N | ~ | Y | Y | Y | N |

What a visitor learns at a glance: live co-editing exists (four projects do it), but the desktop apps people already
know don't have it. The real gap isn't one item, it's the combination: **nobody does live co-editing, faithful Word
files and offline all together.** (Showing "no project has all three of your must-haves" is a natural later step;
v1 shows single items.)

This replaces two of your 13 starting notes ("Live co-editing in LibreOffice", "Word files that look exactly the
same") with answers on LibreOffice's rows.

### Photo editing (replaces Photoshop, Lightroom, Affinity Photo)

| | Non-destructive editing | Opens Photoshop files | Raw camera files | Photo library | Remove unwanted objects | AI photo tools |
|---|---|---|---|---|---|---|
| GIMP | ~ (filters re-openable since 3.0) | ~ | ~ (via a raw plugin) | N | ~ | ~ (plugins) |
| darktable | Y | N | Y | Y | ~ | N |
| RawTherapee | Y | N | Y | ~ | ~ | N |
| Krita | Y | ~ | ~ | N | ~ | ~ (AI plugin) |
| digiKam | ~ | N | Y | Y | ~ | N |
| Pinta | N | N | N | N | ~ | N |

Gaps page result: **"Opens Photoshop files" and "AI photo tools": only partly anywhere.** Nobody gives a full yes.
This is exactly your two GIMP starting notes, now true of the whole group rather than one project. It also tells a
builder something useful: Krita and GIMP both have plugin systems, so "Build it as a plugin" is the honest pointer.

### Password managers (replaces 1Password, LastPass, Dashlane)

| | No server needed | Syncs | Phone app | Browser extension | Passkeys | Share with family | Imports from 1Password/LastPass | Weak/leaked warnings |
|---|---|---|---|---|---|---|---|---|
| Bitwarden | Y | Y | Y | Y | Y | Y | Y | ~ (reports are on the paid plan) |
| KeePassXC | Y | ~ (you sync the file) | N | Y | Y | ~ | Y | Y |
| Vaultwarden | N | Y | Y (Bitwarden's apps) | Y | Y | Y | Y | Y |
| KeePassDX | Y | ~ | ~ (Android only) | N | ~ | N | ~ | ~ |
| Passbolt | ~ (paid hosting) | Y | Y | Y | ~ | Y | Y | ~ |

The "Must have" dropdown does the work here: tick **No server needed + Phone app + Browser extension** and only
Bitwarden stays fully, which is the right answer for most people. Tick **Weak/leaked warnings** too and Bitwarden
drops to partly, which is honest: that part costs money there. (The other three projects in the group are left out
of this table for space.)

### Video calls (replaces Zoom, Meet, Teams)

| | No account needed | No server needed | Smooth with 50+ | Screen sharing | Record | Breakout rooms | End-to-end encrypted | Phone app |
|---|---|---|---|---|---|---|---|---|
| Jitsi Meet | ~ (the host signs in on the free site) | Y | ~ | Y | ~ | Y | ~ (optional) | Y |
| BigBlueButton | Y (guests) | ~ | Y | Y | Y | Y | N | N |
| Element Call | ~ | ~ | ~ | Y | N | N | Y | ~ |
| Jami | Y | Y | N | Y | ~ | N | Y | Y |
| Nextcloud Talk | ~ | ~ | ~ | Y | ~ | Y | N | Y |
| Galène | Y | N | ~ | Y | Y | N | N | N |

Gaps page result: big meetings aren't "missing everywhere" (BigBlueButton does them), but they only come with a
server you run. The gaps page shows that as **"Only with advanced setup"** (see section 3). That's your Zoom starting
note, stated accurately.

### Maps (replaces Google Maps, Apple Maps)

| | Works offline | Spoken directions | Live traffic | Public transport | Opening hours | Car screens | Phone app |
|---|---|---|---|---|---|---|---|
| Organic Maps | Y | Y | N | ~ (metro only) | ~ | Y | Y |
| CoMaps | Y | Y | N | ~ | ~ | Y | Y |
| OsmAnd | Y | Y | N | ~ | ~ | Y | Y |
| OpenStreetMap (website) | N | N | N | N | ~ | N | N |

Gaps page result: **"Live traffic: missing everywhere"** and **"Public transport directions: only partly
anywhere"**. Both are true and both are what Google Maps users ask about first.

### Notes & wikis (26 projects; six shown)

| | Syncs | Phone app | Works offline | Databases and boards | End-to-end encrypted | Imports from Notion/Evernote | Plain files | Live co-editing |
|---|---|---|---|---|---|---|---|---|
| AppFlowy | Y | Y | Y | Y | N | ~ (Notion) | N | Y |
| AFFiNE | Y | Y | Y | Y | N | ~ (Notion) | N | Y |
| Joplin | Y | Y | Y | ~ (plugin) | ~ (optional) | Y | ~ (export) | N |
| Logseq | ~ | Y | Y | ~ | ~ | ~ | Y | N |
| Standard Notes | Y | Y | Y | N | Y | Y | ~ | N |
| Notesnook | Y | Y | Y | N | Y | Y | ~ | N |

The big group is where the dropdown earns its place: 26 cards down to 3 in two taps. And it surfaces the real
Notion-switcher tension: **Notion-style databases and end-to-end encryption are never both a yes.**

### Code hosting (replaces GitHub): a developer group

| | Hosted for you | Quick to run yourself | Imports from GitHub | Line-by-line review | Automated builds | Package registry | Nothing paid-only |
|---|---|---|---|---|---|---|---|
| Forgejo | Y (Codeberg, free) | Y | Y | Y | Y | Y | Y |
| Gitea | Y | Y | Y | Y | Y | Y | ~ (an Enterprise edition exists) |
| GitLab Community Edition | Y (gitlab.com) | Y | Y | Y | Y | Y | ~ (many features are in paid tiers) |
| Gerrit | ~ | ~ | N | Y | N | N | Y |
| Gogs | N | Y | ~ (code only) | ~ | N | N | Y |

Developer groups get the same kinds of items, in developer terms: "Hosted for you" instead of "No server needed",
"Quick to run yourself" for the people who will self-host, and "Nothing locked behind a paid version" because
open-core paywalls are the most common complaint in these groups. (Side note: this group lists both `gitlab` and
`gitlab-community-edition`, which look like the same thing twice.)

---

## 3. How checklists relate to "What's missing", gaps and wishes

### Four different things, kept apart

| | Means | Where it comes from | Where it shows |
|---|---|---|---|
| **(a) This project lacks X** | One project answers **no** (or **partly**, with its note) | The checklist answer | That project's fold-out, the compare table, and it drops out of the "Must have" filter |
| **(b) No open project does X** | Every listed project in the group answers no | Worked out automatically from (a) | Gaps page: **Missing everywhere** |
| **(c) I want this to exist** | People voting that X matters to them | "I want this" votes | Gaps page counts; Most requested; the project's "How to help" |
| **(d) Something the checklist doesn't cover** | A feature nobody listed yet, or something that isn't a feature at all | Free text | Becomes a proposal for a new item, or stays as text (see below) |

### The gaps page levels (all automatic)

For each item in a group, look at all the project answers:

1. **Missing everywhere**: nobody says yes or partly. (Maps: Live traffic.)
2. **Only partly anywhere**: the best answer is partly. (Photo editing: Opens Photoshop files.)
3. **Only with advanced setup**: the only yeses come from projects rated "Advanced setup". This uses the setup
   rating you already approved, and it's where most real-world gaps are for normal people. (Video calls: big
   meetings. Documents: live co-editing done fully only by server projects plus CryptPad.)
4. **Only in abandoned projects**: the only yes is archived or inactive. Shown so nobody thinks it's solved.

Rules that keep this honest:
- A blank (not checked yet) is never counted as no. Only real answers count.
- A group with one listed project says "not in the one open option listed", not "missing everywhere".
- Groups with no projects at all (Professional networking, Disappearing photos) are already a whole-group gap; their
  checklist shows what a builder would need to cover.

### "I want this" votes

- **Where you vote:** on a checklist row ("I want this" next to any no or partly, in the fold-out or compare table)
  and on a gap ("I want this too").
- **What a vote is attached to:** the group and the item, with an optional "in which app?" pick. Without the pick, it
  counts toward the gap. With it ("I want this in LibreOffice"), it also shows on that project's page under "How to
  help", which is what maintainers would actually look at.
- **Pros:** one place to vote for each wish, no duplicates, and the counts are meaningful.
- **Cons:** people can't word their wish; if the item doesn't fit, they need (d).
- Votes need the same sign-in and 14-day account rule as today.

### Free text becomes proposals, or stays as text when it isn't a feature

- **"Suggest a checklist item"**: name, one line on why it matters, which group. Others vote on the suggestion. Per
  your Oct 26 decision to keep GitHub forms for suggesting, this can be a GitHub form like the others, or an on-page
  form that needs a GitHub sign-in.
- **Not features, never items:** price (beyond "Nothing locked behind a paid version" and "Free plan"), how polished
  or easy it feels (the setup rating covers what can be measured), community size (stars), trust in the company
  behind it (the existing notes, like Bluesky's "main network run by one company"), whether your friends are on it
  (Signal vs SimpleX), license changes (Redis). These stay as the existing one-line **note** on the listing, or as
  free text under whichever boards option you choose in `use-cases-and-discussion.md`.

### End-to-end flows

**A switcher choosing (most visitors).**
1. Lands on Documents. Above the list: a **"Must have"** dropdown listing the group's items, each with how many
   projects do it ("Live co-editing (4)").
2. Ticks Live co-editing and Phone app. The list narrows to projects that answer yes or partly on both; full yes sort
   first, and partly shows its note in small text ("Only on the server version").
   - Option: only keep full yes. Pro: stricter. Con: hides near-misses; with few projects you'd often see nothing.
     I'd keep partly and sort it lower.
3. Taps **Compare** to see the remaining projects side by side (on phones: one project per row, items fold under
   it).
4. On a card, opens **"What it does"** to see all items with their answers and notes, plus "Checked Oct 2026" and a
   link to where the answer came from.

**Someone who spots a wrong answer.**
1. Next to any answer: "Is this right? Yes / No".
2. "No" asks for the right answer and, optionally, a link ("It's in version 4.2: link").
3. It goes to the mod queue when **3 signed-in people** say it's wrong, or **one person with a link** to the
   project's own docs or release notes. A developer who has claimed the page shows as "From the Developer", like
   their pitch.
4. A mod changes the answer or keeps it. The people who disputed see the outcome in "Your suggestions".

**A builder looking for something to build.**
1. Opens the gaps page, sorted by "I want this" votes.
2. Sees "Live traffic: missing everywhere, 212 want it", with links to each Maps project's "How to help" and plugin
   docs where they exist.
3. Clicks "I'm building this" (already built for wishes) with a link.

**Someone proposing a new item.**
1. "Suggest a checklist item" on the group page.
2. Others vote. The mod queue shows suggestions with 5 or more votes first.
3. **A mod accepts it if:** it passes the tests in section 1, isn't a duplicate, and the group has room (under 8). If
   the group is full, the mod swaps out its least useful item: the one with the fewest "I want this" votes that also
   doesn't split the projects (everyone answers the same).
4. On acceptance, the filling robot answers it for every project in the group, the item appears, and votes on the
   suggestion carry over as "I want this" votes on the new item.

### What happens to the data we already have

- **The one-line note on each listing** (195 listings have one, like "Desktop; no live co-editing", "Android only",
  "Needs your own server") stays. It's the editor's honest summary and the best place for non-feature facts. The
  fill run reads it as a hint: "no live co-editing" → Live co-editing: no; "Android only" → Phone app: partly;
  "Needs your own server" → No server needed: no. Once checklists are live, notes that only repeat a checklist answer
  can be shortened (the fill run lists them for a mod to approve; nothing is changed silently).
- **Fit (full / partial)** stays as it is. It's the editors' overall judgement and the main sorting factor.
  Checklists don't change it automatically. A project with many no's on a group's first items is a candidate for a
  mod to look at again, nothing more.
- **The 13 starting notes** (`worker/seed-notes.mjs`) all map onto checklist items:

| Starting note | Becomes |
|---|---|
| Live co-editing in LibreOffice | Documents · Live co-editing · LibreOffice Writer: no |
| Word files that look exactly the same | Documents · Opens Word files faithfully · LibreOffice: partly |
| Excel macros and complex formulas | Spreadsheets · Runs Excel macros and Newer Excel formulas · LibreOffice Calc: partly |
| Photoshop (PSD) files with every layer | Photo editing · Opens Photoshop files · GIMP: partly |
| AI generative fill, background removal | Photo editing · AI photo tools · GIMP: partly |
| Captions and templates like CapCut (wish) | Video editing · Automatic captions and Ready-made templates. **Check:** Kdenlive has had automatic subtitles for some years, so "nobody has built this" is likely wrong for captions; templates is the real gap |
| A setup anyone can do (Nextcloud) | Shared item: No server needed · Nextcloud: partly (paid hosting providers exist) |
| Live traffic and busy hours | Maps · Live traffic: missing everywhere |
| Banking apps without Google | Phone operating systems · Banking and wallet apps work · GrapheneOS: partly |
| Big meetings (50+) like Zoom | Video calls · Smooth with 50+ people · Jitsi: partly (only with advanced setup elsewhere) |
| A voice assistant as good as Alexa (wish) | Smart home · Voice assistant · Home Assistant: partly. **Check:** Home Assistant has its own voice assistant and sells a voice speaker, so this is "partly", not "nothing exists" |
| Editing the text inside a PDF (wish) | PDF tools · Edit the words on a PDF page: likely only partly anywhere |
| Opening AutoCAD (DWG) files | CAD · Opens AutoCAD files · FreeCAD and LibreCAD: partly |

So once checklists exist, the starting notes don't need to be posted as notes at all: they are checklist answers and
gaps from day one. Two of them likely overstate the gap (captions, voice assistant), which the fill run will settle.

---

## 4. Filling in about 3,000 answers

### How

- **One robot run per project**, not per answer. It reads the project's website, docs, README, and recent release
  notes, and answers every item that project faces (all its groups at once). Shared items are answered once per
  project.
- For each answer it stores: yes / partly / no, the "partly" note (one short line), **the page it found it on**, and
  the date. The page link is kept for disputes and shown as "Where this came from" in the fold-out. You chose no AI
  label, so the answers look like any other fact on the site.
- **Rules for the robot:**
  - Yes needs a sentence from the project's own pages that says so.
  - No is the hardest to prove (it's proving something is absent). It needs a search of the docs plus the project's
    issue list. An open feature request ("Add live co-editing", 300 thumbs) is the best evidence of a no, and gives
    the "How to help" link for free.
  - If it can't tell, it leaves the answer blank ("Not checked yet"), never guesses no.
  - Device items start from the device list and are only confirmed.
- **A second, cheaper check** on just the uncertain ones: every partly, every no on a group's first two items, and
  everything for the top three projects in the 30 most-visited groups. Then a mod spot-checks a sample (say 5 per
  group) before it goes live.
- **Cost:** about 470 project runs plus a re-check of perhaps a quarter of the answers. I can't give a real figure
  without a trial; it's the kind of job that costs tens of dollars with a mid-sized model and more with the largest.
  **Run it on two groups first** (Documents and Password managers, where we know the answers) to get the real cost
  and the error rate before running the rest.

### Disputes

As in the flow above: "Is this right?" on every answer; 3 people, or 1 with a link, sends it to mods; mods decide.
Developers who claimed their page dispute like anyone else, labelled "From the Developer". (You didn't tick "the
developer edits directly" for checklists, so they can't change answers themselves. That could be added later for
claimed pages if mod time gets tight.)

### Keeping answers current

- Each answer shows "Checked Oct 2026".
- **No and partly answers go stale fastest** (projects add features; they rarely remove them). When the weekly robot
  sees a project ship a new major release, it re-checks only that project's no and partly answers against the release
  notes.
- Everything else is re-checked every 6 months, and immediately on any dispute.
- A "This was fixed" dispute with a release-notes link is the quickest path, and the existing "It's fixed now"
  machinery can be reused for it.

---

## 5. Risks, and what to leave out of v1

### Risks

| Risk | What could happen | What limits it |
|---|---|---|
| **Developers gaming their answers** | A project's fans mass-dispute to turn no into yes, or a rival's yes into no | Disputes only flag for a mod, they never flip an answer; 14-day accounts; a link to the project's own docs settles most of them |
| **Checklists favour big projects** | Big suites (OnlyOffice, GitLab, Odoo) collect yeses; small focused apps look worse | Checklists **don't feed the ranking score in v1**; the filter only removes what you said you must have. Each list deliberately includes items small projects win: Works offline, No server needed, No account needed, End-to-end encrypted, Notes kept as plain files, Light on your site, Nothing locked behind a paid version |
| **Too many items** | Lists creep to 12 as suggestions pile up | Hard cap of 8; one in, one out; mods accept only items that pass the section 1 tests |
| **Wrong answers at launch** | No AI label, so a wrong answer reads as fact | Evidence link on every answer; blanks rather than guesses; the two-group trial; "Is this right?" on every row |
| **Words people read differently** | "Phone app" for a project that only works in a phone's browser | The meaning sentence for each item, shown on tap and given to the robot |
| **Your own project** | YouCoded is in three AI groups; a checklist you designed could look tilted toward it | The AI items were picked from what users of ChatGPT, Copilot and Claude ask for (local models, choose your provider, works in your editor), and several are ones YouCoded doesn't win (Works inside your code editor). Worth a second person reading the AI lists before launch |
| **"Missing everywhere" that's really "missing from our list"** | A project that does it exists but isn't listed | Gap lines say "none of the 4 listed projects"; "Suggest a project" sits next to every gap |

### Leave out of v1

- **Checklists in the ranking score.** Use them for filtering, comparing and gaps only. Revisit once disputes have
  settled the answers.
- **"No project has all your must-haves"** (combination gaps, like Documents' co-editing + Word files + offline).
  Very useful, but later.
- **Developers editing answers directly.**
- **Items that are opinions:** ease of use, polish, speed, accessibility (important, but very hard to check from
  docs; better as a later, separately designed effort), "good support".
- **Per-country items** (bank sync in your country, tax rules) beyond a plain partly.
- **Counting stars or users as an item.** The site already shows stars.

### Small data issues noticed along the way

- Code hosting lists both `gitlab` and `gitlab-community-edition`.
- Weaviate is listed as "SeMI" (its old company name) in Vector databases, and Meilisearch is spelled "Mellisearch"
  in Site & app search.
- Pocket Casts' summary says it's for Android; it's on iPhone too.
