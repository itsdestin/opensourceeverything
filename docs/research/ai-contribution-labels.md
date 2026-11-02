# AI-contribution labels: method and results (2026-10-27)

Companion to `ai-contribution-labels.json` (same folder). Prepared by Claude (claude-opus-5-5) for Open Source Everything. Every entry is AI-prepared and should carry the "temp AI marker" until a maintainer claims the project and sets it.

## Scope

Rule used, as given: Verified, OR at least 5,000 GitHub stars, OR top 3 in any group by the site's own ranking (`site/src/rank.mjs`, with no votes), OR hosted off GitHub (all 38 off-GitHub projects were included, rather than judging which are "well known").

**This gives 398 projects, not the expected 150-220.** The star rule alone covers 307 projects, and top-3 covers 290. Only 69 projects fall outside; they are listed in `notFilled` and should show the empty state ("maintainers can set this"). If Destin wants a smaller set, tighten the star threshold (for example 20,000) or use top 1 per group (363 projects); the JSON can simply be filtered.

## Method

1. **GitHub projects (360).** For each repo, the contributing guide, any AI-policy file and the pull-request template were read from the standard locations (18 contributing paths, 17 AI-policy paths, 6 PR-template paths), reusing the Oct 26 scan cache and fetching the 35 repos it lacked. The organisation-wide `.github` repo was also checked (this is where Mastodon, Nextcloud, YOURLS, Saleor, Matomo and the Open Home Foundation keep theirs). About 75 GitHub API calls in total, batched.

2. **Every paragraph mentioning AI was read by hand**; keyword categories were not used. A filter dropped passages where "AI" or "agent" is about the product (e.g. "LLM providers").

3. **Policies kept on websites** (Mozilla, Fedora, Debian, Blender, GIMP, KDE, Forgejo/Codeberg, Apache, WordPress, GitLab, postmarketOS, F-Droid, and all off-GitHub projects) were researched by a second agent with web search; about 30 external contributing pages linked from GitHub guides were also fetched and searched (that found VictoriaMetrics and FreshRSS).

4. **Every quote was checked by script** to appear word-for-word (ignoring line breaks) in the fetched text, for all GitHub-sourced quotes. Five web quotes (Thunderbird, Krita, Aurora Store, F-Droid, Bitwarden) were read on screen but not machine-checked.

5. **Outside help.** "issue-first" and "not-accepting" come from the guide's own wording (each one read). "welcomes-prs" is otherwise **inferred**: the guide explains how to send pull requests and sets no "ask first" rule (marked in `outsideHelpNote`). Rules like "discuss big features first" were not counted as issue-first.

6. **Where to start.** `contributing` is the guide URL; `goodFirstIssues` is a GitHub search for the project's beginner label, filled only when that label has open issues right now (160 projects).

## Label mapping (applied consistently)

- **non-developers-welcome**: Non-developers welcome. AI-assisted or AI-generated code is accepted, and the conditions are ones a non-developer can meet: say you used AI, test the change yourself, follow the normal quality and size rules. The policy does not require you to understand or explain every line.
- **traditional-developers-only**: Traditional Developers Only. AI tools may be used, but you must understand, test and be able to explain or defend every change yourself (developer-level responsibility); or the project bars AI-written code from newcomers.
- **not-accepted**: Not Accepted. AI-generated code is refused: either all AI-written code, or pull requests that are wholly, mostly or primarily AI-generated (AI as a small helper may still be tolerated; the description says so).
- **see-policy**: See Policy. Only for rules that genuinely do not fit the three labels above (for example, AI allowed only from specific kinds of AI model).
- **None**: No label (empty state). No AI policy was found; maintainers can set one after claiming the project. Rules only about issues, bug reports or descriptions still get a main label for code, with the partial rule in the description.

Deciding rule between the first two: if the policy says you must **understand, explain, defend or maintain** the code (or review it "as if you wrote every line"), it is Traditional Developers Only. If it only asks for disclosure, testing, review or the normal quality bar, it is Non-developers welcome. Bans on pull requests that are "wholly", "mostly", "primarily" or "predominantly" AI-generated count as Not Accepted, because a non-developer cannot meet them; bans on only "fully" AI-generated or "unreviewed" code (PhotoPrism, JabRef) count as Traditional. "Not accepted from newcomers" exceptions (LocalSend: only bug fixes, tiny changes or proven experts) count as Traditional, per the brief.

## Counts

| Label | Projects |
|---|---|
| non-developers-welcome | 44 |
| traditional-developers-only | 54 |
| not-accepted | 20 |
| see-policy | 1 |
| none (empty state) | 279 |

Confidence of the 119 labels: high 64, medium 38, low 17.

Outside help: welcomes-prs 260, not stated 88, issue-first 43, not-accepting 7.

By label:

- **not-accepted**: f-droid, firefly-iii, florisboard, forgejo, freetube, gimp, goatcounter, graphite, immich, krita, mellisearch, obs-studio, opentofu, piefed, pocketbase, postiz, postmarketos, searxng, syncthing, whisper-cpp
- **traditional-developers-only**: airflow, anythingllm, audacity, aurora-store, blender, borgbackup, chromium, clickhouse, comaps, coolify, databend, debian, deepset, documenso, element, fedora, firefox, freecad, gitea, grafana, heliboard, home-assistant, jabref, keycloak, kilo-code, localsend, mastodon, matomo, mediawiki, medusa, meshcentral, mullvad-vpn, netbird, netnewswire, newpipe, nextcloud, nextcloud-calendar, ntfy, obtainium, open-library, photoprism, posthog, qdrant, quickwit, saleor, solidtime, trilium-notes, victoriametrics, vikunja, wordpress, yourls, zed, zettlr, zulip
- **non-developers-welcome**: actual-budget, affine, apache-apisix, apache-openoffice, appwrite, bitwarden, caprover, concrete, crowd-dev, darktable, dolibarr, ente-auth, ente-photos, etherpad, formbricks, freshrss, gitlab, gitlab-community-edition, goose, harper, heroic-games-launcher, jellyfin, karakeep, keepassxc, kodi, librechat, libresign, linkwarden, lutris, nhost, openclaw, opencode, openhands, openproject, ory, penpot, posnic-pos, preset, semi, silex, thunderbird, valkey, vscodium, woocommerce
- **see-policy**: keepassdx

**"None" is not proof there is no policy.** It means none was found in the standard repo files, the organisation defaults, or (for big names) the web. 67 of the 279 unlabelled projects also have no contributing guide at all, so they get no "where to start" either.

## Low-confidence labels (check these first)

- **affine** (non-developers-welcome): only a pull-request checkbox; no written policy.
- **apache-apisix** (non-developers-welcome): no project rule; Apache Foundation-wide licensing guidance only.
- **apache-openoffice** (non-developers-welcome): no project rule; Apache Foundation-wide licensing guidance only.
- **bitwarden** (non-developers-welcome): AI page mostly describes their own tooling; no contributor rule stated.
- **crowd-dev** (non-developers-welcome): points to Linux Foundation guidelines without stating its own rule.
- **dolibarr** (non-developers-welcome): inferred from setup instructions for AI tools and a size warning.
- **freshrss** (non-developers-welcome): only rule is a limit of 10 open AI pull requests.
- **jellyfin** (non-developers-welcome): only a pull-request form field.
- **karakeep** (non-developers-welcome): only a pull-request form field.
- **kodi** (non-developers-welcome): only an AGENTS.md for agents, no contributor policy.
- **matomo** (traditional-developers-only): only an organisation-wide pull-request checkbox.
- **mediawiki** (traditional-developers-only): draft page, not adopted.
- **opencode** (non-developers-welcome): rule is about descriptions/issues only; code label inferred.
- **posnic-pos** (non-developers-welcome): rule is about AI credit only; code label inferred.
- **preset** (non-developers-welcome): Superset: no project rule; Apache Foundation-wide guidance only.
- **semi** (non-developers-welcome): Weaviate: only rule is about bulk AI changes without an accepted issue.
- **solidtime** (traditional-developers-only): rule is about AI-written text and unvouched large PRs; code label inferred.

Medium-confidence calls worth a human look: ClickHouse (very pro-AI, but asks you to understand the codebase, so Traditional), NetBird (says it has "no policy" yet closes PRs whose authors cannot answer questions), Krita (its moratorium said "until October 2026"; no follow-up found), F-Droid (interim "please do not use AI" while a policy is written), OpenTofu (a PR checkbox only), Element and Fedora (Traditional on accountability wording), Appwrite, Penpot, Ory, Goose, Ente (Non-developers welcome on "review/test" wording without "understand").

## Representative examples

- **openclaw** - non-developers-welcome: "Built with Codex, Claude, or other AI tools? **Welcome!** No AI-assistance label or disclosure is required." ([source](https://github.com/openclaw/openclaw/blob/HEAD/CONTRIBUTING.md))  
  Popup: AI and vibe-coded pull requests are openly welcome, with no disclosure needed; they get the same review as any other.
- **silex** - non-developers-welcome: "You can use AI tools, and you do not need to tell me. The rules are the same for everyone, including good first issues:" ([source](https://github.com/silexlabs/Silex/blob/HEAD/CONTRIBUTING.md))  
  Popup: AI tools are fine and need no disclosure; the rule is that you know how to use Silex and test your change by hand in a browser like a real user (an AI agent clicking does not count), with a screenshot.
- **keepassxc** - non-developers-welcome: "If you use Generative AI to write the vast majority of your submission (e.g., agent-based or vibe coding) then you **must document your use of AI** in your pull request." ([source](https://github.com/keepassxreboot/keepassxc/blob/HEAD/.github/CONTRIBUTING.md))  
  Popup: Vibe-coded and agent-written pull requests are accepted if you say so and name the tool; every submission gets the same careful review. Disclosure: If AI wrote most of it, say so and name the service or model.
- **home-assistant** - traditional-developers-only: "In short: AI tools are welcome as an aid, but you must fully understand and be able to explain every change you submit. Contributions made by autonomous agents are not accepted." ([source](https://github.com/home-assistant/core/blob/HEAD/CONTRIBUTING.md))  
  Popup: AI tools are welcome as an aid, but you must fully understand and explain every change, and write the pull-request description yourself. Autonomous agents may not contribute.
- **nextcloud** - traditional-developers-only: "* **Accountability:** You must be able to explain, defend, and modify every line you submit." ([source](https://github.com/nextcloud/server/blob/HEAD/.github/CONTRIBUTING.md))  
  Popup: AI help is allowed with disclosure, but you must be able to explain and change every line and test new features yourself. No autonomous agents, and no AI on "good first issue" tasks. Disclosure: Say so in the pull request and add an "Assisted-by: AGENT_NAME:MODEL_VERSION" line to each commit.
- **netnewswire** - traditional-developers-only: "The author must review the code thoroughly before creating a PR, just as if they had written every line — because the author is responsible for every line." ([source](https://github.com/Ranchero-Software/NetNewsWire/blob/HEAD/CONTRIBUTING.md))  
  Popup: AI-assisted code is accepted if you say so and review it as if you wrote every line. Documentation changes are not accepted at all, and pull requests that add AI features are closed. Disclosure: Note in the commit message or a comment that an LLM was used.
- **blender** - traditional-developers-only: "You must understand and manually review code, designs, bug reports, descriptions and comments you submit." ([source](https://developer.blender.org/docs/handbook/contributing/ai_contributions/))  
  Popup: AI help is allowed, but you must understand and review everything, write your own descriptions, and only humans can be authors. Do not solve "good first issues" with AI. Disclosure: No blanket disclosure of AI use; any tool-generated text passed along verbatim must be clearly indicated, and large tool-assisted changes need a description of the method used..
- **immich** - not-accepted: "We ask you not to open PRs generated with an LLM." ([source](https://github.com/immich-app/immich/blob/HEAD/CONTRIBUTING.md))  
  Popup: Do not open pull requests written by AI, and descriptions and comments must be your own words. Using AI on "good first issue" tasks is forbidden and those pull requests are closed automatically.
- **gimp** - not-accepted: "WARNING: no genAI-generated contents is allowed in any repository managed by the GIMP project (neither code nor text, images…). GIMP is a project for humans by humans." ([source](https://gitlab.gnome.org/GNOME/gimp/-/blob/master/README))  
  Popup: No AI-generated content of any kind (code, text or images) in any GIMP repository; merge requests must tick a "no AI content" box. Disclosure: Contributors declare via MR checkbox that there is no AI content..
- **syncthing** - not-accepted: ":warning: We do not accept contributions that are wholly or mostly AI generated." ([source](https://github.com/syncthing/syncthing/blob/HEAD/CONTRIBUTING.md))  
  Popup: Contributions that are wholly or mostly AI-generated are not accepted, and issues and comments must not be AI-written.
- **keepassdx** - see-policy: "Any code generation tool (LLMs or other assistants) allowed must use models trained on data with proper usage rights, preferably with a fully open-source value chain." ([source](https://github.com/Kunzisoft/KeePassDX/blob/HEAD/CONTRIBUTING.md))  
  Popup: AI-assisted code is allowed only from AI models trained on properly licensed data (ideally fully open-source models), and brute-force generation loops and bloated code are not wanted. Every change gets a slow, careful human review.
- **debian** - traditional-developers-only: "Debian neither endorses nor prohibits the use of generative AI tools in the development, maintenance, or documentation of software, packaging, documentation, and other media published within the Debian Project." ([source](https://www.debian.org/vote/2026/vote_002))  
  Popup: Since an August 2026 vote, AI is allowed if you understand, review and test its output and stay fully responsible; disclosure is encouraged but not required. Disclosure: We enourage our contributors to disclose whether a contribution was made with AI assitance, but do not require them to do so. (typos as in the original).

## Surprises and notes

- Only one project genuinely needed **See Policy**: KeePassDX allows AI code only from models trained on properly licensed data.
- Several big projects have **stopped taking outside code** entirely, citing AI-generated volume: Codex CLI, Documenso, Activepieces, PocketBase, Windmill, Yank Note, OpenCut (critical bugs only).
- **Beginner-task bans** (no AI on "good first issue"): Immich, Nextcloud, Blender; Firefox discourages it.
- Debian adopted a "Responsible Use of Generative AI" resolution by vote in August 2026; KDE's draft LLM guidelines were withdrawn on Sept 21, 2026 after backlash; Inkscape's policy is still "TBD"; PostgreSQL and Ubuntu are still discussing one.
- postmarketOS's AI-ban page now uses the name "Nura" (docs.nura.eco), so the project appears to be renaming itself; worth checking for the catalog entry too.
- Several PR templates contain text addressed to AI agents (Firefly III, Kestra, goatcounter). These were treated as data; Kestra's "joke for agents" line is not a policy and was not labelled.
- **YouCoded itself** (`youcoded`) is in scope (top 3 in its group) and has no written AI policy, so it is unlabelled; Destin can set it as maintainer.
- Limitations: only standard file locations were read (a policy in an unusual path or a wiki may be missed); the Apache, GitLab and WordPress rules are foundation-wide; LibreOffice and Tor Project pages blocked the fetcher, so both are low-confidence "none".
