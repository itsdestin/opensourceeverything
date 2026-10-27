// Turns the research files (feature checklists, switch guides, AI-contribution labels) into the three input files the
// site reads: data/features.json, data/switch-guides.json, data/ai-contribution.json.
// Run: node prefill/import-research.mjs <folder holding feature-tags-draft.json, switch-guides.json, ai-contribution-labels.json, features/>
// WHY a converter (Destin's team rule: nothing reads docs/research directly): the research files carry working notes, long
// "about" text and AI-model names that must never reach visitors. This keeps only what the pages show, and fails loudly
// when a project, group or tag does not exist in the map, so a typo cannot silently drop an answer.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) { console.error('usage: node prefill/import-research.mjs <research folder>'); process.exit(1); }
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const groups = read(join(ROOT, 'data/groups.json')).groups;
const projects = new Set(read(join(ROOT, 'data/projects.json')).projects.map((p) => p.id));
const groupIds = new Set(groups.map((g) => g.id));
// Same spelling rule as site/src/cards.mjs appSlug (closed app -> its page address).
const slug = (n) => n.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const apps = new Set(groups.flatMap((g) => g.closed.map(slug)));
const errors = [];
// WHY: the research wrote "gitlab"; the catalog lists GitLab as gitlab-community-edition.
const ALIAS = { gitlab: 'gitlab-community-edition' };
const pid = (id, where) => { id = ALIAS[id] ?? id; if (!projects.has(id)) { errors.push(`${where}: unknown project ${id}`); return null; } return id; };

// ── Feature checklists ──
const draft = read(join(src, 'feature-tags-draft.json'));
const tags = {}; const groupTags = {};
for (const [gid, list] of Object.entries(draft.groups)) {
  if (!groupIds.has(gid)) { errors.push(`features: unknown group ${gid}`); continue; }
  groupTags[gid] = list;
  for (const t of list) { const d = draft.tags[t]; if (!d) { errors.push(`features: group ${gid} uses unknown tag ${t}`); continue; } tags[t] = { name: d.name, question: d.question, meaning: d.meaning }; }
}
const answers = {};
for (const f of readdirSync(join(src, 'features')).filter((f) => f.endsWith('.json'))) {
  for (const [p0, a] of Object.entries(read(join(src, 'features', f)).answers)) {
    const p = pid(p0, `features/${f}`); if (!p) continue;
    for (const [t, v] of Object.entries(a)) {
      if (!draft.tags[t]) { errors.push(`features/${f}: ${p0} answers unknown tag ${t}`); continue; }
      if (!['yes', 'partly', 'no'].includes(v.v)) continue; // blank = unknown
      // WHY "site data" is dropped as a source: it is not a link a visitor can open.
      (answers[p] ??= {})[t] = { v: v.v, ...(v.note ? { note: v.note } : {}), ...(/^https?:/.test(v.source ?? '') ? { source: v.source } : {}) };
    }
  }
}
writeFileSync(join(ROOT, 'data/features.json'), JSON.stringify({ license: 'CC BY-SA 4.0', note: 'Feature checklists: tags per group, and each project\'s answers (yes / partly / no; a missing answer means unknown).', tags, groups: groupTags, answers }, null, 1));

// ── Switch guides ──
const guides = {};
for (const [s, g] of Object.entries(read(join(src, 'switch-guides.json')).guides)) {
  if (g.skip) continue;
  if (!apps.has(s)) { errors.push(`switch-guides: no closed app with address ${s}`); continue; }
  const opensIn = g.opensIn.map((o) => ({ project: pid(o.project, `switch-guides/${s}`), note: o.note, source: o.source })).filter((o) => o.project);
  guides[s] = { app: g.app, export: g.export, exportSource: g.exportSource, formats: g.formats, wontComeOver: g.wontComeOver, opensIn, tip: g.tip };
}
writeFileSync(join(ROOT, 'data/switch-guides.json'), JSON.stringify({ license: 'CC BY-SA 4.0', guides }, null, 1));

// ── AI-contribution labels ──
// WHY low confidence is dropped (Destin, Oct 27: "just drop the shaky ones for now"): those projects show the empty state.
const ai = {}; let dropped = 0;
for (const [p0, v] of Object.entries(read(join(src, 'ai-contribution-labels.json')).projects)) {
  const p = pid(p0, 'ai-contribution'); if (!p) continue;
  if (v.confidence === 'low') { dropped++; continue; }
  // WHY the "Inferred:" notes stay out: they are the researcher's working notes, not a statement by the project.
  const note = v.outsideHelpNote && !/^Inferred/.test(v.outsideHelpNote) ? v.outsideHelpNote : null;
  ai[p] = { label: v.label, description: v.description, quote: v.quote, source: v.source, outsideHelp: v.outsideHelp, outsideHelpNote: note, contributing: v.start?.contributing ?? null, goodFirstIssues: v.start?.goodFirstIssues ?? null };
}
writeFileSync(join(ROOT, 'data/ai-contribution.json'), JSON.stringify({ license: 'CC BY-SA 4.0', projects: ai }, null, 1));

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`features: ${Object.keys(tags).length} tags in ${Object.keys(groupTags).length} groups, ${Object.keys(answers).length} projects answered; switch guides: ${Object.keys(guides).length}; AI labels: ${Object.keys(ai).length} kept, ${dropped} low-confidence dropped`);
