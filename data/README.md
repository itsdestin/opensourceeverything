# The map's data

Plain JSON, free to read and reuse (CC BY-SA 4.0, see `CREDITS.md`). The site is built from these files.

- `categories.json`: shelves for browsing (Creative, Office & productivity…).
- `groups.json`: one job each (Photo editing). `closed` lists the closed apps it replaces; `alternatives` lists
  projects by id with `fit` (`full` = does the main job, `partial` = some of it) and an optional `note`.
- `projects.json`: each open-source project: `summary`, `kind` (app / self_hosted / developer_tool / library),
  `code` or `website`, `license`, `licenseClass` (`open` / `open_core`), `licenseNeedsCheck` (a mod confirms
  before launch), `stars`, `inactive` (no change in a year), `unconfirmed` (what couldn't be confirmed from
  the project's own page), `verified` (set by mods).
- `starter.json`: the hand-picked starter set these were built from, plus projects left out for not being
  open source. `starter-checked.json`: what the link and license check found.

Rebuild: `node prefill/assemble.mjs` (see `prefill/out/summary.md` for how each step was run).

- `lineage.json`: hand-edited families. Per project id: `of` (a project id) or `ofName` (+ `ofUrl`) for one not on the map,
  `relation` (`fork-keeps-up`, `split`, `continues`, `renamed`, `built-on`, `free-edition`, `unrelated-same-name`), `since`,
  `why` (one neutral sentence), `source` (an https link that backs it), `confirmed` (`mod` shows on the site; `suggested`
  waits), and optional `label`, `oldNames` (searchable) and `redirectFrom` (old project addresses that keep working).
  The weekly robot only suggests families; a mod adds them here.
