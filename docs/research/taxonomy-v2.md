# Open Source Everything: new category structure (draft, Oct 27, 2026)

**What this is.** A proposed new way to sort the site, built by reading all 2,785 real posts we collected (every
r/TrueOpenSource post, plus samples from r/opensource, r/selfhosted, r/linux, r/coolgithubprojects, r/SideProject,
r/OpenSourceAIAllowed, and the r/ClaudeAI posts about TVs and keyboards). Each post was put into one group, or
marked as not fitting. The full list is in `taxonomy-v2-classification.tsv`, and the structure (with possible
projects for every new group) is in `taxonomy-v2.json`.

**The big change.** Today every group means "an open app that replaces a paid app". Most posts don't fit that,
because they're about new tools, developer helpers, Linux tweaks or device hacks with no paid app to replace. The
new structure lets a group be **a job** ("tracking shows you watch", "TV home screens", "memory for AI agents"),
listed with the other open projects that do the same job. The paid product is shown only when one exists.

---

## 1. The new structure at a glance

Six **areas** sit on top. Each has a few **categories**, and each category holds **groups** (the jobs). Counts in
brackets are groups, then how many real posts landed there.

```
Apps for everyday life (the 11 categories you have today, tidied up)
├─ Office and productivity ............ 22 groups · 124 posts
├─ Communication and social ........... 15 · 29
├─ Creative ........................... 16 · 74
├─ Music, video and reading ........... 18 · 138
├─ Games and gaming (new) ............. 6 · 39
├─ Files and cloud .................... 16 · 99
├─ Everyday life ...................... 16 · 81
├─ Browsers, privacy and security ..... 14 · 53
└─ Business and finance ............... 20 · 67
AI
├─ AI apps ............................ 12 · 90
├─ Coding agents and their tools (new). 10 · 150
└─ Building with AI (new) ............. 10 · 38
Operating systems (new area)
├─ Computer systems and Linux distributions .. 11 · 40
├─ Desktops and customization ......... 2 · 37
├─ Under the hood: kernel, drivers, compatibility .. 5 · 52
└─ Phones and tablets ................. 7 · 31
Hardware and devices (new area)
├─ TVs and streaming boxes ............ 7 · 60
├─ Computer accessories and parts ..... 9 · 49
├─ Home, network and personal gadgets . 9 · 18
└─ Making things: 3D printing, electronics, radio .. 6 · 18
Developer tools (split from today's one "Developer & business")
├─ Writing code ....................... 18 · 117
├─ Hosting, shipping and running code . 11 · 52
├─ Databases, data and science ........ 11 · 27
└─ Building blocks for apps ........... 16 · 48
Self-hosting and system tools (new area)
├─ Home servers and self-hosting ...... 10 · 65
├─ IT security ........................ 4 · 37
└─ Computer utilities ................. 16 · 82
```

That's 6 areas, 27 categories and 317 groups: your 123 current groups (all kept, same ids, 41 moved to a better
category) plus 194 new ones.

## 2. What's new

### Operating systems, with the kernel / desktop split you asked for
- **Computer systems and Linux distributions.** Linux is sorted by who it's for: *people leaving Windows or
  Mac* (Mint, Zorin), *all-round* (Debian, Fedora), *gaming* (Bazzite, CachyOS), *privacy* (Tails, Qubes),
  *can undo bad updates* (Silverblue, NixOS), *old or slow computers* (antiX, Puppy), *build it your own way*
  (Arch, Gentoo, Omarchy) and *home server / NAS* (TrueNAS, OpenMediaVault). Two more groups: *BSD and other
  systems*, and *install sticks* (Ventoy, Rufus).
- **Desktops and customization.** Desktop environments and window managers (KDE, GNOME, Hyprland) are kept
  separate from themes, extensions and "rice". The second group had 28 posts, one of the biggest in the corpus.
- **Under the hood.** The kernel and system core, drivers ("getting hardware working on Linux"), filesystems,
  *running apps from other systems* (Wine, Proton, Bottles, Waydroid) and *installing apps on Linux* (Flathub,
  AppImage, AUR helpers).
- **Phones and tablets.** The current phone groups plus *Linux on phones* (11 posts, mostly "Linux on iPhone"
  and tablets), *rooting Android*, *phone home screens* and *using your phone with your computer*.

### Hardware and devices: TVs first
- **TVs and streaming boxes** had 60 posts, more than many current categories. It splits into *TV home screens*
  (22, e.g. Homestead for Fire TV, skippy-tv for Shield, launchers for LG webOS), *removing ads and bloat*
  (17, e.g. tv-vibehack on ~150 TV models, the Xiaomi android-tv-debloat script, phone apps that debloat a
  Google TV over Wi-Fi), *replacing or unlocking the TV's system* (8, e.g. LibreELEC, "Smart TV OS
  replacements?", a proposal for a full Linux TV system), *better TV apps*, *controlling the TV from a phone*,
  *casting* and *dashboards on a spare screen*.
- **Computer accessories:** keyboards (QMK/ZMK/VIA vs Razer, Logitech and Corsair apps), mice (Piper/OpenRazer
  vs G Hub/Synapse), Stream Deck-style button pads, webcams, monitor brightness, fans/RGB (OpenRGB vs
  Armoury Crate/iCUE), driver updates and BIOS (coreboot).
- **Home, network and personal gadgets:** routers (OpenWrt, OPNsense), cameras (Frigate vs Ring/Nest), smart
  home, car apps, earbuds (LibrePods vs the AirPods app), smartwatches, e-readers, gaming handhelds and security keys.
- **Making things:** circuits and chips (KiCad), microcontrollers, robots, 3D printing, factory control and
  tracking planes and ships with a cheap radio.

### New groups for developer tools, utilities and AI tooling (with no paid app needed)
- **Coding agents and their tools** is the single busiest category (150 posts): running many agents at once,
  skills and plugins, memory, apps and phone remotes, MCP connectors, sandboxes and guardrails, usage/token
  meters, code maps for agents, and planning tools.
- **Building with AI:** model gateways (LiteLLM), watching what AI apps do (Langfuse), testing AI apps, agent
  frameworks, preparing documents for AI search, downloadable models, phone/voice agents and "describe it and
  AI builds it" app makers.
- **Writing code** gains terminals, shells, git apps, code review, code checkers, testing, languages, package
  managers, docs tools, reverse engineering and game engines.
- **Computer utilities:** clipboard managers, launchers, window snapping, screenshots, copying text from the
  screen, notch/desktop widgets, live wallpapers, system monitors, Windows/Mac debloat, setting up a new computer,
  equalizers and accessibility tools.
- **Everyday gaps filled:** converting files (22 posts), music and video players (28), tracking shows (13),
  workouts, travel, job hunting, food tracking, taxes, family trees, comics, game mods and game servers.

## 3. Coverage before and after

"Project posts" leaves out posts with no software or device subject: rule fights, memes, general news, general
questions, and 321 r/selfhosted posts removed by moderators with no text left. "Before" counts project posts that
fit one of today's 123 groups. It came out at 28%, a little above the earlier 24–26% sample because the groups
were matched generously. "After" uses the new structure.

| Where the posts came from | All posts | Project posts | Fit today | Fit new structure |
|---|---|---|---|---|
| **All subreddits** | 2,785 | 1,880 | 532 (28%) | **1,715 (91%)** |
| r/TrueOpenSource | 80 | 39 | 11 (28%) | **37 (95%)** |
| r/OpenSourceAIAllowed | 43 | 31 | 10 (32%) | 29 (94%) |
| r/opensource | 1,000 | 722 | 213 (30%) | 668 (93%) |
| r/selfhosted | 600 | 214 | 85 (40%) | 202 (94%) |
| r/linux | 300 | 199 | 24 (12%) | 191 (96%) |
| r/coolgithubprojects | 400 | 386 | 103 (27%) | 340 (88%) |
| r/SideProject | 200 | 178 | 66 (37%) | 145 (81%) |
| r/ClaudeAI (TV/keyboard searches) | 162 | 111 | 20 (18%) | 103 (93%) |

The goal was 85–90%, and the result is 91% overall and 95% on r/TrueOpenSource. If the 20 thinnest new groups
were left out at launch (see Decision 2), coverage would still be about 90%.

## 4. What still doesn't fit (165 posts, 9%)
- **62 are too vague to sort.** The post is only a name ("Rymembra", "AuroraStudio") or a bare "please review
  my project", with no description.
- **24 are novelty toys:** a monkey civilisation made from GitHub commits, a caffeine calculator, a Zen garden,
  an AI "excuse butcher".
- **About 40 are one-of-a-kind niche tools:** a crop-disease app, an exam-seat monitor, a trademark lookup, a
  payment-fraud engine, a stratospheric balloon. None has two or more peers, so a group would be junk.
- **About 20 are small developer libraries, directories or learning sites** that aren't apps.
- r/SideProject fits worst (81%). Many posts there are one-off consumer startups (wardrobe app, caregiver
  marketplace, AI "traders") rather than open-source tools.

## 5. What changes for visitors
- **Navigation:** the top menu shows 6 areas instead of 11 categories. Clicking an area opens its categories,
  then the groups. Search is unchanged, but finds far more because the jobs exist.
- **Home page:** the 11 category tiles become 6 area tiles. A "most active" strip can show the busiest groups
  (coding agents, TV home screens, players, converters).
- **Groups with no paid rival** (games, the kernel, agent memory) simply list the open projects. There's no
  "replaces X" line, so no empty labels.
- **Current groups that move** (same id, same URL slug, new home):
  - *Developer & business is split up.* To Writing code: code editors, API tools. To Hosting/running: code
    hosting, app hosting, builds and tests, monitoring, feature flags, infrastructure as code. To Databases:
    SQL, key-value, graph, time-series, warehouses, site search, data pipelines. To Building blocks: app
    backends, login, internal tools, email sending, push notifications, voice APIs, translation management,
    product analytics, SaaS starters. To Business: website analytics, online stores, customer support,
    automation, website builders.
  - *Operating systems & phones is split up.* Computer operating systems goes to Computer systems. Phone systems,
    app stores and phone keyboards go to Phones and tablets. Remote desktop goes to Computer utilities.
  - *Other moves.* VPN & private networks goes to Self-hosting. Security scanning goes to IT security. Smart home
    goes to Hardware. Game stores goes to Games. AI coding assistants goes to Coding agents. ML platforms and
    vector databases go to Building with AI.
- **Widened jobs** (thin new ideas folded into an existing group instead of a new one): phone keyboards also
  cover typing other languages on a computer; icons also cover free stock images; e-books also cover offline
  libraries (Kiwix); privacy VPNs also cover getting around internet blocks; maps also cover transit; notes also
  cover journaling; browsers also cover tab managers.

## 6. Risks
- **Too many groups.** 317 groups is almost three times today's 123. 20 new groups have only 0–1 posts, and 26
  current groups also had none in this corpus. All of them have at least three real projects that do the job,
  but a visitor who sees a lot of near-empty pages loses trust. Decision 2 covers this.
- **Thin "open side" on closed hardware.** For TVs, mice, earbuds, phone home screens and handhelds, the open
  part is an app or launcher running on a device that stays closed. Calling a Samsung TV "open source" would be
  misleading. The JSON marks each hardware group as one of three kinds: *open software on closed hardware*,
  *open replacement firmware (some devices only)*, or *open software, often on open or generic hardware*. The
  page should say which in a few words (Decision 4).
- **Device lock-in and safety.** Debloating or rooting a TV can void a warranty or brick it. Groups like this need
  a short "check your model first" line, and only there.
- **Candidates are not checked yet.** Every project listed for a new group is marked "candidate". A later pass
  must check licences. Ones I already know need care: SteamOS and Omarchy are mostly but not wholly open,
  Typebot's licence needs checking, Aseprite and FanControl are left out because they aren't open-source,
  and Projectivy (a popular TV launcher) is closed.
- **Corpus bias.** The r/ClaudeAI sample was searched for "TV" and "keyboard", so those groups look bigger than
  they would in a random sample. r/selfhosted lost half its posts to moderator removals.
- **Categories are uneven.** Desktops and customization has 2 groups and 37 posts, while Office has 22 groups.
  That's fine to browse, but it looks lopsided on an overview page.

## 7. Decisions for you

**1. How the top level looks.**
- *A. 6 areas, each with categories (as drafted).* Pros: room for Linux, hardware and dev tools without crowding
  the everyday apps, and each area page stays short. Cons: one extra click to reach a group.
- *B. About 15 flat categories* (merge, e.g. all of Developer into 2). Pros: one click like today. Cons:
  categories with 30–40 groups become long lists, and Linux and hardware get squeezed.
- *C. Keep today's 11 and add 4* (Linux, Hardware, Coding agents, Utilities). Pros: smallest change. Cons:
  "Developer & business" stays a grab bag.
- **Recommend A.** It's the only one where every category stays a list a person can scan.

**2. How many groups go live at first.**
- *A. All 317.* Pros: 91% coverage now. Cons: 46 pages (20 new and 26 current) had almost no posts.
- *B. Current groups plus new groups with 2 or more posts (about 297), with the 20 thinnest kept hidden until a
  project is tagged into them.* Pros: about 90% coverage, and no near-empty new pages. Cons: someone hunting for,
  say, family-tree apps finds nothing until it opens.
- *C. Only new groups with 5 or more posts.* Pros: every page is busy. Cons: coverage drops to about 80% and most
  hardware groups disappear.
- **Recommend B.** The hidden groups can open automatically once the first project is added.

**3. Groups with no paid rival.**
- *A. Show the open projects only, with no "replaces" line.* Pros: matches your rule against filler text.
  Cons: the "switch away from X" story is weaker on those pages.
- *B. Show "No paid equivalent" in that spot.* Pros: explicit. Cons: it's text that helps nobody navigate.
- **Recommend A.**

**4. Being honest about hardware.**
- *A. One short tag on hardware groups: "Runs on the device you already own; the device itself stays closed",
  or "Replaces the device's own software on some models".* Pros: true and short. Cons: one more element on the page.
- *B. A separate category, "Mods for closed devices".* Pros: clear. Cons: splits TV launchers from TV systems,
  which people look for together.
- *C. No label.* Cons: overclaims "open".
- **Recommend A.**

**5. Where coding-agent tools live.**
- *A. Under AI (as drafted).* Pros: that's where people who search "Claude Code memory" or "MCP" look, and it's
  the busiest category. Cons: everyday AI users see developer jobs next to chat apps.
- *B. Under Developer tools.* Pros: keeps AI apps simple for everyday users. Cons: hides the most active topic in
  the corpus inside a developer area.
- **Recommend A**, with AI apps listed first so everyday users see chat, images and transcription before agent
  tooling.

**6. What the home page shows.**
- *A. 6 area tiles plus a "most active groups" strip.* Pros: short, and shows what's hot. Cons: the everyday-apps
  message is less upfront.
- *B. Everyday categories first (as today), with the other 5 areas as a second row.* Pros: keeps the "switch from
  paid apps" story first for non-technical visitors. Cons: a longer page.
- **Recommend B.** Most first-time visitors come to replace a paid app, and the new areas still show on the same
  screen.
