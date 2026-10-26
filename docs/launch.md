---
status: draft
---
# Launch kit

Drafts for Destin to edit and send. Nothing here is posted or sent automatically.

## 1. Message to esk (before anything is public)

> Hey! I've been building something for the sub and wanted your OK before it goes public.
>
> It's called **Open Source Everything**: a site that shows open-source replacements for closed apps (Google Docs →
> LibreOffice, Photoshop → GIMP…), grouped by the job they do. It also shows where nothing good exists yet, so builders
> know what's worth making. About 430 projects so far, every license checked. It uses the same license and age rules as
> our sub (the bot's checker is shared).
>
> Three questions:
> 1. Are you OK with the site saying **"supported by r/TrueOpenSource"**?
> 2. Want to **co-own it**? I'd move the repo to a GitHub organization so we both have full access.
> 3. Could you skim `docs/mod-review.md`? It has the license confirmations and a proposed list of "Verified" picks. Mods decide those.
>
> Suggestions from anyone come in as GitHub forms. A robot checks them, and a mod approves with one label. Preview: [link]

## 2. Launch post (r/TrueOpenSource)

**Title:** We made a map of open-source replacements for closed apps, including where none exist yet

> Ever wanted to leave Google Docs, Photoshop or Notion and not known what to switch to? We built
> **Open Source Everything**: [link]
>
> - **Search the app you use** and see the open-source projects that replace it: "fully" or "partly", with what's missing.
> - **Filter by device:** Windows, Mac, Linux, Android, iPhone, or "no server needed".
> - **Only real open source.** Every license is checked against the OSI list, with the same rules as this sub. "Open core" is labelled.
> - **The gaps page** shows jobs nothing open does well yet (LinkedIn, Bloomberg, Canva…). If you're looking for something to build, start there.
> - **Building something?** Each job has a "Before you build" prompt so you can see what already exists and reuse it.
>
> Something missing or wrong? Every page has a "Suggest a change" button. A robot checks the license, then a mod approves.
> The site, its code and its data are all open (CC BY-SA 4.0).
>
> What should we add first?

## 3. Monthly thread (pin on the 1st)

**Title:** What should be replaced next? (Month YYYY)

> Name one closed app you'd love to leave but can't, and why. The most-upvoted become gaps on
> [the map](link/gaps/), so builders know what people want.
>
> Building something for one of last month's gaps? Share it in the Showcase thread.

## 4. Going live (Claude does this once Destin says "launch")

1. Merge the `site` branch into `main` and push. The suggestion forms and robots only work from `main`.
2. Switch on GitHub Pages: Settings → Pages → Source: GitHub Actions. Then run the "Site" workflow with "publish" ticked.
3. After launch, publish automatically on every merge to `main`, so approved suggestions go live by themselves.
4. Pin the launch post and update the subreddit sidebar with the link.
5. ~~Buy opensourceeverything.org~~ Done Oct 27 (Cloudflare Registrar, auto-renew). DNS points at GitHub Pages
   (4 A, 4 AAAA, www CNAME, all "DNS only"), and the repo's Pages site has the domain attached, so nobody else can claim it.
   At launch: once the first publish is live, turn on "Enforce HTTPS" (`gh api -X PUT repos/itsdestin/opensourceeverything/pages -F https_enforced=true`).
   The Cloudflare DNS token is in ~/.config/alternatives-map/cloudflare-token (DNS edit only); delete it at Cloudflare when no longer needed.
