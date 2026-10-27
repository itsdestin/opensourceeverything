---
status: draft
---
# Contributor preferences: letting a project's developers say how they'd like help (Oct 27, 2026)

A design proposal, no code. It builds on what is already decided: the four AI labels
(`ai-contribution-labels.md`), "From the Developer" and the claim flow on branch `redesign`, "How to help" on project
pages, the card's details fold, and Destin's rule: **"If it doesn't obviously help a user navigate a page in a way that
nothing else on the page does, drop it."**

## The short version

- After a developer claims their listing, the claim page gets **one more step: "How you'd like help."** It asks
  **seven short questions plus one optional note**. Everything we can find in their own files is already filled in,
  so it takes about two minutes.
- Visitors see **one line in the card's details fold** and **a fuller "How to help" section on the project page**,
  with the details behind the AI label's pop-up. No new chips on the card face.
- AI agents get the same answers in the data files, plus rules in "Copy prompt": follow the project's rules, say when
  AI was used where asked, never sign legal lines for a person, and skip projects that refuse AI code.
- Cut: a separate "corporate experience" question, bounties, the code-of-conduct link, and a free-text "Where help
  is wanted" box (a pick list replaces it).
- The point for the subreddit: someone about to build a duplicate sees "Looking for co-maintainers" or "Build it as a
  plugin". Help goes where it is wanted, and AI-written code stays away from projects that refuse it.

---

## 1. Who reads these, and what they decide

Each reader makes one real decision: **show up here, show up somewhere else, or build something new.** The table lists
what they must know *before* they spend any time.

| Reader | The decision | What they need to know first |
|---|---|---|
| **Vibecoder with an AI agent** (the subreddit's core) | Send my AI-built change here, build a plugin instead, or start my own project? | Is AI-written code accepted? Do I have to say so, and how? Is AI banned on beginner tasks? Should I open an issue before sending code? Is there a plugin route? |
| **Experienced developer** | Is this worth a weekend? | Do they take outside code? Ask first or just send it? How long until someone looks at it? Do I need to sign anything? |
| **Corporate engineer** (often paid to fix one bug upstream) | Can I contribute at all, and how long will the paperwork take? | **Contributor agreement or sign-off line**: their company's lawyers may need weeks to approve an agreement. Whether outside fixes get reviewed soon enough to matter. |
| **Student or first-timer** | Is there a safe first task, and will anyone help me? | Do they welcome newcomers and guide them? Where are the beginner tasks? Is AI allowed on those tasks? (Immich, Nextcloud and Blender ban it there.) |
| **Designer, translator, docs writer, tester** | Is my kind of help wanted, and where do I go? | Do they want design, translation, docs or testing? The direct link (their translation site, design file, forum). |
| **AI agent acting for someone** | Proceed, change approach, or stop and tell its person? | All of the above, as plain values it can follow: the AI label, the disclosure format, "a person must sign; you can't", the route, and the date these were last set. |

What none of them need: a long description of the project's values, ratings of the maintainers, or anything the
contributing guide link already gives in full.

---

## 2. The fields

**How the list was chosen:** the field must change a reader's decision from section 1, the answer must fit in a few
words, and nothing else on the page may say it already. A rough keyword count over the 310 contributing guides in our
Oct 26 scan backs up which topics real projects actually raise. It is a quick word search, not a reading, so it
over-counts: testing ~224, docs ~207, translation ~99, forum/discussions ~88, plugins ~69, contributor agreement ~66
(over-counted), code of conduct ~67, beginner tasks ~57, "open an issue first" ~57, Discord ~53, review-time or
"be patient" wording ~33, sign-off line ~24, sponsorship ~13, bounties ~11.

The owner's form has **seven questions and one optional note**. Questions 1 to 4 show on the page. Questions 5 to 7 and
the note sit one tap deeper.

### Q1. AI contributions (reuses the four decided labels)

- **Question the owner answers:** "Can people send you code written with AI help?"
- **Options:** Non-developers welcome · Traditional developers only · Not accepted · See policy (a short box to
  explain, required).
  - One plain sentence under each option says what it means. The wording is the label mapping already decided in
    `ai-contribution-labels.md`.
- **Three optional ticks**, because these partial rules are common and an agent has to obey them:
  - "No AI on beginner tasks"
  - "Write issues and pull-request descriptions yourself"
  - "No fully automatic agents"
- **Shows as:** "AI contributions: Traditional developers only" with an (i). The pop-up holds the ticks, the
  disclosure rule (Q5), the sign-off rule (Q6), and their own words with a link where we have them.
- **Why it earns its place:** this is the question that started the whole feature. A wrong guess either scares off
  welcome help or puts AI code in front of a project that refuses it.

### Q2. How to start

- **Question:** "What should someone do before sending you work?"
- **Options:** Just send a pull request · Open an issue first · Start a conversation in our forum or chat (link) ·
  Email us (address) · We're not taking outside code right now.
- **One optional tick:** "Small fixes like typos can skip this and go straight to a pull request." This only shows with
  "Open an issue first" or the forum/chat option.
- **The communication channel lives here.** For the forum, chat and email options the link is required. For the other
  options, an optional "Where to ask questions" link appears. That makes one channel field, not two.
- **Shows as:** "Start: open an issue first", with the link as a button. "Not taking outside code" is the line
  already approved for the details fold (round 3, A-closed).
- **Why it earns its place:** unrequested pull requests are the main thing that wastes maintainers' time and gets
  newcomers closed without a word. 43 projects already ask for "issue first" and 7 have stopped taking outside code.

### Q3. Help wanted most

- **Question:** "What help would you most like? Pick up to three."
- **Options:** Code · Design · Documentation · Translation · Testing (trying new versions, reporting bugs) · Sorting
  issues · **Co-maintainers (people to help run the project)** · Funding.
  - Each pick can take one link, for example their translation site, their sponsor page or a design file.
- **Shows as:** "Wanted: translation, testing, co-maintainers."
- **Why it earns its place:** it is the only field that routes **non-coders**, and it feeds the "Help wanted, by what
  you can do" page (use-cases 4.5). "Co-maintainers" is the strongest answer to the duplicate-project problem: a solo
  developer asking for help running the project is exactly where a would-be duplicator should go.
- **It replaces** the free-text "Where help is wanted" box in today's "From the Developer" form, so the page doesn't
  say it twice. (This changes the existing claim form. Text already written there moves into the optional note.)

### Q4. Newcomers

- **Question:** "Are you set up for first-time contributors?"
- **Options:**
  - "Yes, we'll point you to a task and answer questions." Shows as "Newcomers: we'll help you".
  - "Yes, but you'll mostly be on your own." Shows as "Newcomers welcome, self-guided".
  - "Not right now: experienced contributors only." Shows as "Experienced contributors".
- The beginner-task count we already collect sits next to it ("Good first issues 12 →").
- **Why it earns its place:** it covers both "experience expected" and "mentorship" in one question. The task count
  shows that tasks exist; only the owner can promise that someone will help.

### Q5. Saying you used AI (only asked if Q1 isn't "Not accepted")

- **Question:** "If AI helped, how should people say so?" Tick any.
- **Options:**
  - No need to say
  - Mention it in the pull request
  - Tick the box on our pull-request form
  - Add an "Assisted-by:" line to each commit (the line Nextcloud and the Linux kernel use)
  - Something else (short box)
- **Shows as:** a line in the AI pop-up ("Say so: add an Assisted-by line to each commit").
- **Why it earns its place:** about half of projects that have a policy require disclosure, and the format differs.
  An agent can follow this exactly; a person can't guess it.

### Q6. Signing anything

- **Question:** "Do contributors need to sign anything?"
- **Options:** Nothing · A sign-off line on each commit ("Signed-off-by", the Developer Certificate of Origin) · A
  contributor agreement before the first merge (link).
- **Shows as:** a line in the pop-up: "Each commit needs a sign-off line from a person, which an AI can't add for
  you", or "Sign their contributor agreement first →".
- **Why it earns its place:** it is the corporate engineer's first question, and it is where agents go legally wrong.
  Several projects say only a person can sign. It stays in the pop-up because most visitors never need it.

### Q7. How fast you review

- **Question:** "How soon do you usually look at a new pull request?"
- **Options:** Within a few days · Within a few weeks · It can take a month or more (small team) · Don't show this.
- **Shows as:** "Reviews: usually within weeks" on the project page only.
- **Why it earns its place:** small teams said this is what they want understood. It stops "any update?" nudges and
  lets a corporate engineer judge whether a fix will land in time. It is an expectation, not a promise. The risks are
  in section 4 and it is decision 4.

### Optional note: "Anything else people should know before they start?"

- 200 characters, plain text, for example: "We're rewriting the interface for v3; please hold interface changes until
  then."
- **Shows as:** one grey line at the bottom of the section.
- **Why:** it catches the one temporary rule that the questions can't. It is short, so it can't become a second
  contributing guide.

### What was cut, and why

| Cut | Why |
|---|---|
| **"Corporate engineering experience" as its own question** | Owners rarely filter by where someone works, and it can't be checked. It reads as gatekeeping. What owners actually mean is "can you stand behind your code" (the Traditional developers only label) or "not for beginners" (Q4). |
| **Paid work and bounties** | About 11 guides mention them. A bounty is already shown on the issue it belongs to. Advertising bounties draws the rushed, low-quality AI pull requests the launch post's comments warned about. Revisit if owners ask. |
| **Code of conduct link** | Nearly every project uses one of a few standard texts, and it doesn't change anyone's decision to show up. The contributing guide (already linked) points to it. |
| **Separate "communication channel" question** | Merged into Q2, so there is one place for "where to talk". |
| **Separate "beginner tasks" question** | Merged into Q4. The task count is collected automatically. |
| **"Vibecoders welcome" wording** | Already covered by "Non-developers welcome", and it stays neutral as decided (no "vibecoder-friendly"). |
| **"Does the project use AI tools itself"** | Our robot already reads it from their files (`AGENTS.md`, `CLAUDE.md`). Asking again would duplicate it. It shows as a fact, not as permission. |
| **"How big a change you accept"** | Covered by Q2 ("issue first, small fixes direct") plus the optional note. |

---

## 3. How it shows on the site

### Card fold (group pages, search results)

Destin asked for details in the fold, not as chips on the card. The fold gets **one line, at most three parts**, picked
in this order of importance: the AI label, then how to start, then help wanted.

> Contributing: AI: Non-developers welcome · Open an issue first · Wants translation

If they're not taking outside code, the line says only that, in their words, as already approved.

### Project page: the existing "How to help" section, reorganised

Plain rows, top to bottom. A row only appears when there is an answer.

1. **AI contributions:** label + (i) pop-up (Q1 ticks, Q5, Q6, their own words with a link)
2. **Start:** "Open an issue first" + button (Q2, with its chat or forum link)
3. **Wanted:** translation (link) · testing · co-maintainers (Q3)
4. **Newcomers:** "We'll help you" + "Good first issues 12 →" (Q4 and the existing count)
5. **Build a plugin instead →** (existing hand-checked plugin-docs link, which the owner can now confirm or change)
6. **Reviews:** usually within weeks (Q7)
7. The optional note, then **"Read the contributing guide"** (the existing link)

The footer says once where it came from: **"From the Developer · updated Oct 27, 2026"**, or **"From their
contributing guide · checked Oct 27, 2026"**. The page says it only there, not on every row. On phones the section folds
as it does today.

### Filters

A **"Contributing" multi-select dropdown** (Destin's preferred filter style) on group pages, "Before you build" and the
Help wanted page:

- Welcomes AI-assisted help (Non-developers welcome)
- Allows AI help (either of the two "allowed" labels)
- Taking outside code
- Good for newcomers
- Wants non-code help (design, docs, translation, testing)
- Accepts plugins
- Looking for co-maintainers

A filter only narrows the list and never changes ranking, as already decided, so no stance is rewarded or punished.

### AI-agent data feed

Each project in the data files and `llms.txt` gets a "contributing" block holding every answer above as plain values:
the label, the three ticks, disclosure format, sign-off type, route and link, small-fixes rule, newcomers, help
wanted, plugin link, review speed, the note, **where it came from and the date**, and the guide link plus quote.
"Copy prompt" and the "Before you build" prompt tell the agent:

- Follow the project's own rules, and when the site and their files disagree, follow the stricter one (section 4).
- Disclose AI use in exactly the format asked.
- Never add a sign-off line or sign an agreement; tell your person they must.
- If the label is "Not accepted", don't send code there. Suggest the plugin route, another project, or non-code help.
- If the route is "Open an issue first", open the issue and stop until a maintainer answers.
- If nothing is stated, read their contributing guide, disclose AI use, and ask before sending anything large.

### Unclaimed projects (the empty state)

This follows Destin's earlier call: important projects are AI-drafted, smaller ones show a clear empty state.

- **Drafted from their own files**, only where we can quote a source:
  - AI label (102 labels ready to ship)
  - Q2 route (about 310 projects)
  - Q6 sign-off or agreement (the robot can detect the standard sign-off and agreement checkers)
  - Translation link (from their translation site's badge)
  - Funding link (GitHub's standard sponsor file)
  - Plugin docs (the mods' list)

  These show normally, with the footer "From their contributing guide · checked [date]". The listing-wide line
  "drafted with AI assistance… claim this listing" already appears at the top, so no extra per-row marker.
- **Never drafted:** Q4 newcomers, Q7 review speed, co-maintainers and the note. Those are promises only the
  developers can make, so they stay hidden until claimed.
- **Nothing found:** the section shows only "AI contributions: not stated" plus the contributing guide link, if there is
  one. "Not stated" is kept for the AI row alone, because agents and vibecoders need to know the answer is unknown. The
  other rows simply don't appear. The claim link is already at the top of the page, so it isn't repeated.

---

## 4. Keeping it honest and current

**Owner edits:**
- A claimed developer can change answers any time from "Your claimed projects".
- The footer date updates on every save.
- Any verified maintainer of the same project can edit, the latest save shows, and mods can see who changed what.
- Ownership is re-checked the way pitches already are: if proof stops standing, the answers fall back to the drafted
  ones.

**When their written rules disagree with their answers:**
- The weekly robot already re-reads contributing guides and AI policies. When either changes after the owner's last
  save, and the change looks like it contradicts Q1 or Q2, a mod confirms it with one click. This step is needed
  because the robot misreads these often (it tagged 33 projects as "bans AI" when only 6 to 8 do).
- Once confirmed, **both show**: the owner's answer stays on top, and the pop-up adds "Their contributing guide says:
  '…' (checked [date])".
- The owner sees "Your guide and your listing disagree" on their claimed-projects page.
- Agents are told to follow the stricter of the two, because the repo file is what reviewers actually enforce.
- **Old answers:** after 12 months without a save, the footer reads "updated over a year ago". Nothing is hidden, but
  readers can judge.

**Abuse risks:**

| Risk | What limits it |
|---|---|
| **Owners overstating openness** ("everyone welcome, reviews in days") to collect free work or attention | Openness earns **no ranking boost**, so there's little reason to lie. Q4 and Q7 are worded as expectations. The robot can privately compare Q7 with how long their pull requests actually wait and flag big gaps to a mod. **No measured number is shown publicly**, in line with Destin rejecting the merge-share figure. |
| **A non-owner setting answers** | The same proof as the claim (own GitHub account or a file in the repo), re-checked over time. The name of the person who saved it is visible to mods. |
| **Two maintainers disagreeing** | Last save wins, and mods see the history. Rare enough to handle by hand. |
| **Scam or junk links** (fake donation pages) in link fields | **Link changes wait for a mod**, like pitches. Option choices go live at once (decision 1). |
| **People attacking a project for its stance** | Neutral wording, no comments or votes on this section, and no contributor reports (Destin declined those). |

**How this serves the subreddit's mission:**
- **Fewer duplicate projects.** A builder about to start "an open Canva" sees, in one fold line, that Penpot takes
  plugins, welcomes AI help and wants design work. A solo project can say "Looking for co-maintainers". Joining
  becomes as easy to see as starting fresh, which was the launch post's best comment.
- **Better-routed help.** Translators go to the translation site, students go to projects that promise guidance, and
  AI-built changes go to projects that welcome them. That directly answers the warning that the site could flood
  busy maintainers.
- **A reason to claim.** Developers get fewer bad pull requests and more of the help they asked for. Claiming also
  clears the "drafted with AI" line, which makes the whole map more accurate.
- **Agents check here first.** No other list feeds these rules to agents before they contribute.

---

## 5. Phased plan

1. **Show what we already have (small).**
   - Reorganise "How to help" and add the fold line.
   - Ship the 102 AI labels, the route answers, beginner counts and plugin links.
   - Teach the robot the sign-off and agreement checkers, translation badges and the sponsor file.
   - Add the feed block and the agent rules to the prompts.
   - No owner form yet.
2. **Owner form (small to medium).**
   - Add "How you'd like help" as step 4 of the claim page's step cards, prefilled from phase 1.
   - Retire the free-text "Where help is wanted" box.
   - Add the footer date, edit from "Your claimed projects", and mod review of links.
3. **Filters and upkeep (medium).**
   - The Contributing dropdown and the Help wanted page by kind of help.
   - The disagreement watcher and owner notice, and the private review-speed check.
   - Subreddit bot replies showing the stance and route.

**What users will notice that they might not expect:**
- The "From the Developer" form loses one free-text box; existing text moves to the note.
- "How to help" changes from four buttons to labelled rows.
- About three in four unclaimed projects show only "AI contributions: not stated".

---

## 6. Decisions for Destin

1. **Do owner answers go live at once, or wait for a mod like pitches?**
   - *Live at once, links held for a mod (recommended):* owners see the result immediately, and mods only check links,
     which is where scams hide. Con: a false "reviews in days" is live until the private check flags it.
   - *Everything waits for a mod:* nothing wrong goes live. Con: more mod work, and owners wait to see their change.
2. **When their answers and their written guide disagree?**
   - *Show both, agents follow the stricter (recommended):* honest, and nobody's change gets closed for following a
     stale answer. Con: one more line in the pop-up, and a mod click to confirm.
   - *Owner always wins:* simplest. Con: an out-of-date answer sends AI code to a project whose file now refuses it.
   - *Their file always wins:* always matches what reviewers enforce. Con: makes the owner form pointless whenever a
     file exists.
3. **Unclaimed projects: draft from their files, or show nothing?**
   - *Draft only the sourced fields, never the promises (recommended):* useful for 300+ projects today, and every
     drafted row has a quote behind it. Con: a few drafts will be wrong until claimed.
   - *"Not stated" until claimed:* zero mistakes. Con: almost every page is empty, and agents get nothing.
4. **Include the review-speed question (Q7)?**
   - *Yes, project page only, with "Don't show this" allowed (recommended):* it sets expectations small teams asked
     for. Con: some owners will be optimistic, and it can read as a promise.
   - *No:* nothing to overstate. Con: loses the clearest help for corporate engineers and the "any update?" problem.
5. **Make "Looking for co-maintainers" prominent (its own filter, and a list on "Before you build")?**
   - *Yes (recommended):* the most direct way to turn a would-be duplicate project into a co-maintainer. Con: it can
     make users wonder whether the project is struggling, so it stays in the "How to help" section and never on the
     card face.
   - *Keep it as one ordinary "help wanted" pick:* quieter. Con: builders rarely notice it.
