# The map's data

Plain JSON, free to read and reuse (CC BY-SA 4.0, see `CREDITS.md`). The site is built from these files.

- `categories.json`: shelves for browsing (Creative, Office & productivity…).
- `groups.json`: one job each (Photo editing). `closed` lists the closed apps it replaces; `alternatives` lists
  projects by id with `fit` (`full` = does the main job, `partial` = some of it) and an optional `note`.
- `projects.json`: each open-source project: `summary`, `kind` (app / self_hosted / developer_tool / library),
  `code` or `website`, `license`, `licenseClass` (`open` / `open_core`), `licenseNeedsCheck` (a mod confirms
  before launch), `stars`, `inactive` (no change in a year), `unconfirmed` (what couldn't be confirmed from
  the project's own page), `verified` (set by mods).
- `redirects.json`: groups that were split into better-defined jobs (old id → new ids); the site keeps the old address
  working with a "pick the job" page.
- Not in the published copies on the site: `unconfirmed`, `source`, `sourceLists` on projects and `review` on listings are
  the AI pre-fill's notes for mods. They stay in these source files.
- `starter.json`: the hand-picked starter set these were built from, plus projects left out for not being
  open source. `starter-checked.json`: what the link and license check found.

Rebuild: `node prefill/assemble.mjs` (see `prefill/out/summary.md` for how each step was run).
