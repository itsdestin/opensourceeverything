# Open Instead

**Open source everything.**

A public site, made with [r/TrueOpenSource],(https://www.reddit.com/r/TrueOpenSource/) that shows which open-source
projects replace each closed-source app, where no good replacement exists yet, and what builders could reuse
instead of starting over.

**Status:** planning and clickable design demos. Nothing is live yet.

## What's here

| Folder | What it is |
|---|---|
| `docs/v1-plan.md` | The plan: what the site does, how it's hosted, build order |
| `docs/open-questions.md` | Decisions still open |
| `mockups/` | Clickable demos. Open `mockups/home.html` in a browser. All data in them is made up |
| `checker/` | Checks a project's public facts (age, license, activity, README, stars, contributors). Shares its rules with the subreddit's [mod bot](https://github.com/itsdestin/trueopensource-bot) |

## Checker

```
cd checker
npm install
npm test
```

## Licenses

- Code: BSD-3-Clause (see `LICENSE`). `checker/src/from-bot/` is copied from the mod bot under its own BSD-3-Clause license.
- The map's data, once published, will be CC BY-SA 4.0.
- The demo wallpapers in `mockups/assets/` come from [YouCoded](https://github.com/itsdestin/youcoded) (MIT).
