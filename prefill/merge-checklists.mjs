// Adds the new groups' checklists (prefill/out/new-group-checklists.json) and answers (prefill/out/new-group-answers.json)
// to data/features.json. Run after prefill/import-research.mjs, which rewrites that file from the first research pass.
// Run: node prefill/merge-checklists.mjs
//
// WHY a separate merge (not inside import-research.mjs): the first pass is hand-researched with sources per answer; these are
// AI-read from each project's README. Keeping them in their own files lets either be redone without touching the other,
// and an answer from the first pass always wins over a new one.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const file = join(ROOT, 'data/features.json');
const f = read(file);
const lists = read(join(HERE, 'out/new-group-checklists.json'));
const answers = read(join(HERE, 'out/new-group-answers.json'));
const groupIds = new Set(read(join(ROOT, 'data/groups.json')).groups.map((g) => g.id));
const projectIds = new Set(read(join(ROOT, 'data/projects.json')).projects.map((p) => p.id));
const errors = [];
for (const [gid, tags] of Object.entries(lists.groups)) {
  if (!groupIds.has(gid)) { errors.push(`unknown group ${gid}`); continue; }
  if (f.groups[gid]) continue; // a group from the first pass keeps its researched list
  f.groups[gid] = tags;
  for (const t of tags) if (!f.tags[t]) { if (lists.tags[t]) f.tags[t] = lists.tags[t]; else errors.push(`${gid}: unknown item ${t}`); }
}
let added = 0;
for (const [pid, a] of Object.entries(answers)) {
  if (!projectIds.has(pid)) continue; // a project a later fix removed
  for (const [t, v] of Object.entries(a)) if (f.tags[t] && !f.answers[pid]?.[t]) { (f.answers[pid] ??= {})[t] = v; added++; }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
writeFileSync(file, JSON.stringify(f, null, 1));
console.log(`features: ${Object.keys(f.groups).length} groups with checklists, ${Object.keys(f.tags).length} items, ${added} new answers merged`);
