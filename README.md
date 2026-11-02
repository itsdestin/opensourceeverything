# Open Source Everything

A public site, made with [r/TrueOpenSource](https://www.reddit.com/r/TrueOpenSource/), that shows which open-source
projects replace each closed-source app, where no good replacement exists yet, and what builders could reuse
instead of starting over. Live at [opensourceeverything.org](https://opensourceeverything.org).

**Where the work stands, what's left and how to run it: [`docs/status.md`](docs/status.md).**

## What's here

| Folder | What it is |
|---|---|
| `site/` | The site: `node site/build.mjs` writes `site/dist`, `node site/serve.mjs 4322` previews it |
| `data/` | The map itself, as plain JSON (see `data/README.md`) |
| `prefill/` | Scripts that fill and check the data (license checks, AI steps, the weekly refresh) |
| `worker/` | The server at api.opensourceeverything.org: sign-in, votes, notes, claims, the AI connector |
| `checker/` | Checks a project's public facts (age, license, activity). Shares its rules with the subreddit's [mod bot](https://github.com/itsdestin/trueopensource-bot) |
| `docs/` | Status, server rules, mods' decisions, launch drafts; `docs/research/` holds the research the data was filled from; `docs/archive/` is history |

## Licenses

- Code: BSD-3-Clause (see `LICENSE`). `checker/src/from-bot/` is copied from the mod bot under its own BSD-3-Clause license.
- The map's data is CC BY-SA 4.0 (see `data/CREDITS.md`).
- The wallpapers in `site/assets/` come from [YouCoded](https://github.com/itsdestin/youcoded) (MIT).
