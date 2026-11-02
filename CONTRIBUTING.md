# Helping with the map

You do not need to write code. Most changes start as a short form on GitHub, and a robot does the editing after a
mod approves.

## The easy way (no code)

Use the buttons on the site, or [open a form](https://github.com/itsdestin/opensourceeverything/issues/new/choose):
add a project, add a closed app, suggest a group, fix a mistake, or report a project. A robot checks it and a
r/TrueOpenSource mod approves it. You will get a thank-you with the live link when it is merged.

## Sending a change yourself (a pull request)

**The data files in `data/` are generated. Do not edit `data/groups.json` or `data/projects.json` by hand:** the next
rebuild (`node prefill/assemble.mjs`) overwrites them. Edit the input file that fits, then rebuild.

| You want to change | Edit this file | Notes |
|---|---|---|
| Add a project, a closed app or a group; fix one fact | `data/edits.json` | Same shape the suggestion robot writes: `type` is `add-project`, `add-closed-app`, `new-group`, `fix` or `remove-project`. Copy an existing entry. Applied last, in order. |
| Place a project in a group, add a closed app to a group, fix a spelling | `prefill/placements.json` | |
| Devices a project runs on | `prefill/platform-fixes.json` | |
| "Replaces fully / partly", or remove a bad listing | `prefill/review-edits.json` | |
| A license that was read wrongly | `prefill/license-fixes.json` | Include the link that proves it. |
| A screenshot | `prefill/screenshot-fixes.json` | |
| Search words for a group or project | `data/search-keywords.json` | |
| Plugin or extension docs for a project | `data/plugin-docs.json` | Shown in "How to help". |
| A project mods vouch for | `data/verified.json` | Mods only. |

Then, from the repo folder:

```
node prefill/assemble.mjs        # rebuilds data/groups.json, projects.json, categories.json
node prefill/sync-forms.mjs      # keeps the GitHub forms' pick lists in step (only needed when a group or category is added)
node site/build.mjs && node site/check.mjs
```

Open the pull request. The **Site** check builds the site and checks every link; a mod merges when it is green.
The map is licensed CC BY-SA 4.0, and your changes are shared under the same terms.

## Other parts

- `site/` is the website (plain pages built by `site/build.mjs`; preview with `node site/serve.mjs`).
- `worker/` is the voting and notes server. Its rules are in `docs/server-rules.md`.
- `.github/robot/` is the suggestion robot. Test it with `node --test .github/robot/test/`.
