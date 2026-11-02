# Alternatives Map: plan (draft, Oct 25, 2026)

A public site, run with r/TrueOpenSource, that shows what open-source projects already replace each
closed app, where real gaps are, and helps builders reuse existing work instead of starting over.

## What people can do

1. **Closed app pages** (e.g. "Notion"): every open alternative listed, each with
   - stars from users (sign in with GitHub to star)
   - details: license, how it was built (our 4 labels), last activity, age, what's reusable
   - comments: what it does well, what it's missing compared with the closed app
2. **Gap votes**: "Nothing good replaces this yet" per closed app, with comments on what's missing,
   and comments on the closed app's own flaws (why people want to leave it).
3. **Tag your project**: owners (proved by GitHub sign-in) add their project as an alternative and write
   a short pitch against that specific closed app: strengths, weaknesses, what's reusable, help wanted.
   Later: an automatic AI review of the claim.
4. **Before you build**: when tagging a project or posting to the Showcase, the site shows existing
   projects for that closed app and asks "What does yours do differently?"
5. **Agent check**: a copy-paste prompt (and later a direct connection for coding assistants) that lets
   any AI assistant compare someone's idea or codebase against the list and suggest what to reuse.

## Open data

- The whole list is published as plain files in a public GitHub repository, so anyone or any agent
  can read or copy it.
- License: CC BY-SA (share-alike), required because we import awesome-selfhosted data, which uses it.
  Anyone can reuse it if they credit us and share their changes the same way.

## Pre-filling (before launch, so the site isn't empty)

| Source | Allowed? | Notes |
|---|---|---|
| OpenAlternative list (github.com/piotrkulpinski/openalternative) | Yes, CC0 (no conditions) | Closed app → open alternatives, already organized |
| awesome-selfhosted data | Yes, CC BY-SA 3.0 | Credit required; sets our data's license |
| Each project's own GitHub page | Yes, public facts | License, age, activity, README |
| AlternativeTo | **No** | Their terms forbid scraping and "building a competing database from our content". Could ask them for permission. |

Fast, low-cost AI helpers (Haiku) do the pre-fill: one per project. Each reads the project's GitHub page and records the facts. Each writes a neutral two-line summary from the project's own README and flags anything it couldn't confirm. People spot-check a sample before launch.
Run only after a cost estimate is approved.

## Order of building

1. **GitHub checker**: given a repo link, report age, how spread out the work is, license, README,
   activity. Used right away by the subreddit bot (rule 5 is currently honor system), then by the site.
2. **Data repo + pre-fill run**.
3. **Site, read-only**: browse closed apps, alternatives, details. Hosted free on GitHub Pages.
4. **Sign-in, stars, gap votes, comments**: a small separate Cloudflare server and database.
5. **Tag your project + "before you build" + agent prompt**.
6. Later: AI review of tagged projects, bounties.

## Where it lives

- Own folder/repository (not YouCoded). Look and feel from YouCoded's design guide.
- Separate Cloudflare server from YouCoded's, so a problem in one can't break the other.

## Open questions for Destin

- Name for the site.
- Own GitHub repository (needs his OK to create) under his account or a TrueOpenSource organization.
- Whether esk6plays wants to co-own it.
