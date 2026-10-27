// "See also" for group pages: the 3 to 5 other groups most related to this one. No network, no AI, and the same
// answer on every build (ties break by name), so a page never reshuffles between visits.
// How "related" is worked out, strongest first:
//   - they replace the same closed app (Photoshop is in both Photo editing and Digital painting): 4 points each
//   - they list the same open projects (GIMP is in both): 3 points each, at most 3
//   - people search for them with the same words (data/search-keywords.json; at least 2 shared words): up to 2 points
//   - same category: 1.5 points (also the fallback, so every page gets at least 3 links)
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appSlug } from './cards.mjs';

const KW_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'search-keywords.json');
const KW = existsSync(KW_FILE) ? JSON.parse(readFileSync(KW_FILE, 'utf8')).groups ?? {} : {};
// Words that say nothing about the job, ignored when comparing what people type.
const BORING = new Set('a an the to for of my me i and or with on in at from your app apps free open source alternative alternatives replace replacement instead without that how do can what is it'.split(' '));
const phraseWords = (id) => new Set((KW[id] ?? []).join(' ').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !BORING.has(w)));

export function relatedGroups(d, perPage = 5) {
  const info = d.groups.map((g) => ({
    g, apps: new Set(g.closed.map(appSlug)), projects: new Set(g.alternatives.map((a) => a.project)), words: phraseWords(g.id),
  }));
  const out = new Map();
  for (const a of info) {
    const scored = [];
    for (const b of info) {
      if (b.g.id === a.g.id) continue;
      const apps = [...a.apps].filter((x) => b.apps.has(x));
      const projects = [...a.projects].filter((x) => b.projects.has(x));
      const shared = [...a.words].filter((w) => b.words.has(w));
      const jaccard = a.words.size && b.words.size ? shared.length / (a.words.size + b.words.size - shared.length) : 0;
      const sameCat = a.g.category === b.g.category;
      const score = 4 * apps.length + 3 * Math.min(projects.length, 3) + (shared.length >= 2 ? Math.min(2, jaccard * 10) : 0) + (sameCat ? 1.5 : 0);
      // WHY the reason is kept: the page says WHY it is a neighbour, so the link isn't a mystery.
      const reason = apps.length ? `Also replaces ${a.g.closed.find((c) => appSlug(c) === apps[0])}`
        : projects.length ? `${projects.length} ${projects.length === 1 ? 'project' : 'projects'} in both` + (projects.length <= 2 ? `: ${projects.map((p) => d.projById.get(p)?.name).filter(Boolean).join(', ')}` : '')
        : shared.length >= 2 && jaccard >= 0.08 ? 'People search for both in similar words'
        : sameCat ? `Also in ${d.catById.get(b.g.category)?.name ?? 'the same category'}` : '';
      scored.push({ g: b.g, score, reason });
    }
    scored.sort((x, y) => y.score - x.score || x.g.name.localeCompare(y.g.name));
    // 3 to 5 links: everything that scored at least 3 (a real overlap), topped up to 3 with the best of the rest.
    const strong = scored.filter((s) => s.score >= 3).slice(0, perPage);
    out.set(a.g.id, strong.length >= 3 ? strong : scored.slice(0, 3));
  }
  return out;
}
