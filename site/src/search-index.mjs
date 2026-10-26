// The search index (search.json): what the search box ranks. Its own file so the search tests
// (site/test/search-eval.mjs) build exactly the same index without running the whole site build.
import { appSlug } from './cards.mjs';

export function searchIndex(d) {
  const firstGroup = (pid) => d.groupsByProject.get(pid)?.[0]?.group;
  const gIndex = new Map(d.groups.map((g, i) => [g.id, i]));
  const groupsOf = (pid) => (d.groupsByProject.get(pid) ?? []).map((x) => x.group);
  return {
    // WHY one entry per closed app, pointing at its own page: an app in two groups (Photoshop) appears once.
    // WHY reversed before the Map: a Map keeps the last value per key, so this keeps each app's FIRST group
    // (Spotify → Music streaming, not Podcasts), matching the order of its own page.
    closed: [...new Map(d.groups.flatMap((g) => g.closed.map((c) => [appSlug(c), { n: c, g: g.name, j: g.job, u: `alternatives-to/${appSlug(c)}/` }])).reverse()).values()].reverse(),
    groups: d.groups.map((g) => ({ n: g.name, c: d.catById.get(g.category)?.name ?? '', j: g.job, x: g.closed, u: `g/${g.id}/` })),
    projects: d.projects.map((p) => {
      const gs = groupsOf(p.id);
      return {
        n: p.name, g: firstGroup(p.id)?.name ?? '', u: `p/${p.id}/`,
        // WHY group positions, not copies: the group's name, job and closed apps are already in "groups";
        // search-core.js joins them back up, which keeps this file small for phones.
        gi: gs.map((g) => gIndex.get(g.id)),
        // WHY the editors' order: each group lists its alternatives best-first (GIMP before Pinta), which knows
        // more than star counts do. r = best position in any of its groups.
        r: Math.min(...(d.groupsByProject.get(p.id) ?? []).map((x) => x.group.alternatives.findIndex((a) => a.project === p.id)).filter((i) => i >= 0), 9),
        s: p.summary, ...(p.stars != null ? { st: p.stars } : {}), ...(p.archived || p.inactive ? { dead: 1 } : {}),
      };
    }),
  };
}
