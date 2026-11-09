---
status: active
updated: 2026-11-09
---
# Community features: Destin's decisions and the step-2 design (Oct 25 – Nov 9)

WHY this file: on Nov 3 the step-2 questions deck (`decisions/community-1.questions.json`) confused Destin, because earlier
rounds had already decided parts of it. Three agents read every deck answer, the planning docs and his own messages.
This is the result, plus the step-2 design he approved afterwards, so later sessions start here rather than re-asking.
Quotes are his, verbatim. **This file replaces the community part of `evidence-map-design.md` §4 (points 5–7).**

## The goal, in his words

- Oct 26: "the goal of this site/post is to stop duplicating work in FOSS."
- Oct 26: "this is the trick to stop duplicatin software work in os, we can track existing os and encourage people to
  build their project by using or pulling in existing work from the list"
- Oct 26: "user ratings as the primary trust indicator" … "i really want dsicussion to be built into the page itself,
  tied to github accounts"
- Oct 26 (on the subreddit): "It's like the mods viewed it as their thing and not the community's thing."
- Nov 2: "with an easy full understanding of how one project relates to all others, how it compares directly against
  each individual competitor, how the community regards each, to quickly help consolidate effort and
  contributions/support around the best performing open source projects"
- Nov 2: "i just want it to show someone what the open source community is missing, as compared to everything that
  already exists. and how all of the elements interrelate." Inspired by RTINGS.
- Nov 2: "for the fixed comparison categories, they can be filled at the start with ai but then later be updated after
  some threshold of community responses are submitted? with comments and such offered ways to rank/star sentiment"

## Standing decisions

| Decision | When / where |
|---|---|
| GitHub sign-in only (no Reddit sign-in); accounts under 14 days can't vote; a new account's first post waits for a mod | Oct 26 chat; round-3 D-signin |
| No site-made stars for projects: GitHub stars shown, plus our own up/down vote ("okay maybe we do keep an upvote/downvote system. but not stars") | Oct 26 chat |
| "Does it do the job?" thumbs up/down per project per subcategory; "Most voted" as a sort | Oct 26; redesign-3 G-group-phone |
| The "What's missing" boards are off the pages (their notes are still stored on the server, shown nowhere). Comments only where tied to an action | redesign-3 Q-boards, Oct 27 |
| Open discussion goes to the group's r/TrueOpenSource thread | round-3 D-reddit |
| Checklists replace free-text "what's missing" posts | review-2026-10-26 Q-seed; features-and-stance F-build |
| Developers claim their project; their text is "From the Developer"; contributor preferences optional | Oct 27 decks |
| "Want this" button on Gaps / Most requested | Q-contrib; final-2 F-gaps |
| Suggestions for new apps, groups and fixes stay GitHub forms | review-2026-10-26 Q-anon |
| No filler, nothing that doesn't uniquely help; no extra marks or notes in headers and tables | redesign-2 R-card; evidence-1 E-9 |
| No "Discontinued" / "Renamed" label anywhere ("absolutely not … overbusy slop") | evidence-1 E-9, Nov 2 |
| Use YouCoded's real pieces, not new styles ("too many unique elements", "closer to native youcoded styling") | community-2, Nov 3 |

## Where he changed his mind (later wins)

| Topic | Earlier | Later (standing) |
|---|---|---|
| Discussion | Oct 26: on-page boards per category | Oct 27: boards removed; comments only tied to an action; open talk on Reddit |
| Stars | Oct 26: "star open alternatives" | Oct 26: GitHub stars + up/down, "not stars". Nov 3: features use yes / partly / no, not stars |
| When people's answer replaces the AI's | Nov 2 design: 5 well-rated, matching results; AI's original stays visible | Nov 3: an average once 5 people answer; AI's original not shown (Q-5, Q-7) |
| Credit | Boards showed GitHub names | Nov 3: no names on totals ("averages, not attribution"); GitHub names on comments are fine |
| Developers | Oct 27: not a corrector | Nov 3: "a separate section of answers as provided by project maintainers, then a community sentiment/ranking version" |
| Corrections | Nov 3 deck: a correction form that a second person confirms | Nov 3: dropped; replaced by votes and comments with an average (below) |

## Step 2 design (approved Nov 3)

One pattern, inside the popup that opens when someone taps a ✓ ~ ✗ mark (compare tables, project-page feature lists,
paid-app "How they compare" tables). Nothing new is added to the tables themselves.

- **What we found:** the AI's answer, its quote and source, as in step 1. Hidden once people's answer has taken over.
- **From the developer:** the verified developer's own yes / partly / no and a short note, kept apart and never counted
  in the average. Open projects only, and only developers who claimed their project ("Tag my project").
- **What people say:** a signed-in person picks Yes / Partly / No. Totals show from the first answer ("3 people: 2 yes ·
  1 partly"), with no names. Comments show GitHub names. A link is optional.
- **The table's mark:** at 5 answers it shows people's average (yes = 1, partly = ½, no = 0, rounded).
- **Blank "not checked yet" dots** can be tapped and answered.
- **Same sign-in rules:** GitHub; accounts under 14 days can't vote; a new account's first comment waits for a mod.
- **"Does it do the job?"** thumbs stay. After "Not really", a small popup asks "What stopped it?" (an optional comment).
  The score shows counts from the first answer ("2 yes · 1 not really").

## Design rounds

| Deck | Result |
|---|---|
| `community-1.questions` (Nov 3) | Confused by overlap with earlier decisions; this file was written from it |
| `community-2.review` (round 1) | The flow was OK; the look was rejected as busy and unlike YouCoded |
| `community-3.review` (round 2, rebuilt from YouCoded's Marketplace Feedback section, comment list, one-job card and pill switch) | Popup, the mark taking over, blank dots, phone and "What stopped it?" approved. Three notes below still to do |

**Round-2 notes still to do (round 3):**
1. **C-0, Cards / Compare switch:** "these sliders still look odd. the internal fill isn't seated properly."
2. **C-4, From the developer** (approved otherwise): "i still think the from the developer section can be simpliifed a bit".
3. **C-7, "What stopped people" on project pages:** "it should definitely still be hidden/expandable behind a button, but it
   needs to be styled properly. and comments here should also be grouped into cards."

## Built so far (branch `evidence`, preview only)

The popup (`site/assets/opinions.js`) and "What stopped it?" (`site/assets/social.js`) work against the preview's pretend
server (`site/assets/fake-api.js`), with made-up sample votes. `site/assets/api.js` already names the real server's calls,
but **the real server part is not built**: no database tables, no checks, no mod tools, and no nightly copy of people's
answers into the data files (needed so the filters and the Gaps page use them). It waits until Destin approves round 3.

## Still open

- The 13 starter notes still stored on the server, shown nowhere.
- Community-submitted tests (`evidence-map-design.md` §3–4) wait for the tests step.
