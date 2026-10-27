// The search index (search.json): what the search box ranks. Its own file so the search tests
// (site/test/search-eval.mjs) build exactly the same index without running the whole site build.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appSlug } from './cards.mjs';
import { familyIndex, oldNames } from './family.mjs';

// WHY optional: the site still builds (with plainer search) if the keywords file is missing.
const KW_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'search-keywords.json');
const KW = existsSync(KW_FILE) ? JSON.parse(readFileSync(KW_FILE, 'utf8')) : { groups: {}, projects: {} };

export function searchIndex(d) {
  const fam = familyIndex(d);
  const firstGroup = (pid) => d.groupsByProject.get(pid)?.[0]?.group;
  const gIndex = new Map(d.groups.map((g, i) => [g.id, i]));
  const groupsOf = (pid) => (d.groupsByProject.get(pid) ?? []).map((x) => x.group);
  return {
    // WHY one entry per closed app, pointing at its own page: an app in two groups (Photoshop) appears once.
    // WHY reversed before the Map: a Map keeps the last value per key, so this keeps each app's FIRST group
    // (Spotify → Music streaming, not Podcasts), matching the order of its own page.
    closed: [...new Map(d.groups.flatMap((g) => g.closed.map((c) => [appSlug(c), { n: c, g: g.name, j: g.job, u: `alternatives-to/${appSlug(c)}/` }])).reverse()).values()].reverse(),
    // k: phrases people might type (data/search-keywords.json, written by prefill/search-keywords.mjs).
    groups: d.groups.map((g) => ({ n: g.name, c: d.catById.get(g.category)?.name ?? '', j: g.job, x: g.closed, u: `g/${g.id}/`, k: KW.groups[g.id] ?? [] })),
    projects: d.projects.map((p) => {
      const gs = groupsOf(p.id);
      // WHY old names (forks stream): people search "kbin", "Perplexica", "Simple Mobile Tools", "OpenOffice". `o` are the old
      // names and `ot` the sentence to show with the result ("Looking for kbin? It continues as Mbin."), both from data/lineage.json.
      const on = oldNames(p, fam);
      return {
        n: p.name, g: firstGroup(p.id)?.name ?? '', u: `p/${p.id}/`,
        // WHY group positions, not copies: the group's name, job and closed apps are already in "groups";
        // search-core.js joins them back up, which keeps this file small for phones.
        gi: gs.map((g) => gIndex.get(g.id)),
        // WHY the editors' order: each group lists its alternatives best-first (GIMP before Pinta), which knows
        // more than star counts do. r = best position in any of its groups.
        r: Math.min(...(d.groupsByProject.get(p.id) ?? []).map((x) => x.group.alternatives.findIndex((a) => a.project === p.id)).filter((i) => i >= 0), 9),
        // WHY the summary only when there are no phrases: the phrases already say what it does in searchers' words
        // (and dropping summaries keeps the file small), but a project added since the last phrase run
        // (prefill/search-keywords.mjs --only <id>) still needs something beyond its name to be found by.
        ...(on.length ? { o: on.map((x) => x.old), ot: on.map((x) => x.text) } : {}),
        pl: p.platforms ?? [], k: KW.projects[p.id] ?? [], ...(KW.projects[p.id] ? {} : { s: p.summary }), ...(p.stars != null ? { st: p.stars } : {}), ...(p.archived || p.inactive ? { dead: 1 } : {}),
      };
    }),
  };
}
