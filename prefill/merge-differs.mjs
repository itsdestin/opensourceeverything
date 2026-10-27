// Copies the "how it differs" lines written by the research pass into data/lineage.json (the file the site is built from).
// Run: node prefill/merge-differs.mjs <path to lineage-differs.json>     then: node prefill/assemble.mjs
// WHY a script and not hand edits: the research file is keyed by project id with { differs, differsFromChild, source }; this only fills the
// two text fields on entries that already exist, and never touches relations, sources or confirmations (those stay hand-edited).
import { readFileSync, writeFileSync } from 'node:fs';
const [, , from] = process.argv;
const src = JSON.parse(readFileSync(from, 'utf8')).entries ?? {};
const f = new URL('../data/lineage.json', import.meta.url);
const data = JSON.parse(readFileSync(f, 'utf8'));
let n = 0;
for (const [id, e] of Object.entries(src)) {
  const t = data.lineage[id]; if (!t) continue;
  if (e.differs) t.differs = e.differs;
  if (e.differsFromChild) t.differsFromChild = e.differsFromChild;
  n++;
}
writeFileSync(f, JSON.stringify(data, null, 1) + '\n');
// WHY also patch data/projects.json: it is the assembled copy the site reads; assemble.mjs does the same thing for these two fields (and needs the checker built), so a later full assemble gives the same result.
const pf = new URL('../data/projects.json', import.meta.url);
const pj = JSON.parse(readFileSync(pf, 'utf8'));
for (const p of pj.projects) { const e = data.lineage[p.id]; if (p.lineage && e) { if (e.differs) p.lineage.differs = e.differs; if (e.differsFromChild) p.lineage.differsFromChild = e.differsFromChild; } }
writeFileSync(pf, JSON.stringify(pj, null, 1) + '\n');
console.log(`${n} family entries updated`);
