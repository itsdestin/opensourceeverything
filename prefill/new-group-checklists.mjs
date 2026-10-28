// Checklists for the new groups, step A (paid, about $1 with Claude Opus 5.5): design 4 to 8 checklist items for every new group
// that has projects, reusing the shared items people already know (No server needed, Phone app...) and adding job-specific ones.
// Writes prefill/out/new-group-checklists.json. Step B (new-group-answers.mjs) answers them per project.
// Run: node prefill/new-group-checklists.mjs [--count]
//
// WHY the same rules as the first 123 groups (docs/research/feature-tags-draft.md, Destin's checklist deck): an item must change
// someone's choice, split the field, be checkable from the project's own pages, be one question, and mean the same everywhere.
// WHY one request per category, with the strongest model: items must be consistent across neighbouring groups, and naming a
// shared item vs a new one is a judgment call across the whole shelf.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const features = read(join(ROOT, 'data/features.json'));
const groups = read(join(ROOT, 'data/groups.json')).groups;
const projects = new Map(read(join(ROOT, 'data/projects.json')).projects.map((p) => [p.id, p]));
const cats = new Map(read(join(ROOT, 'data/categories.json')).categories.map((c) => [c.id, c.name]));
const todo = groups.filter((g) => g.source === 'taxonomy' && g.alternatives.length);
const use = new Map(); for (const l of Object.values(features.groups)) for (const t of l) use.set(t, (use.get(t) ?? 0) + 1);
// WHY only shared items are offered for reuse: a one-group item ("Opens Word files faithfully") belongs to its group.
const shared = Object.entries(features.tags).filter(([t]) => (use.get(t) ?? 0) >= 2).map(([id, t]) => `- ${id}: ${t.name}. ${t.question} (${t.meaning})`).join('\n');
const existingIds = new Set(Object.keys(features.tags));

const SYSTEM = `You design short feature checklists for a public map of open-source software, read by everyday people.
Each group (a job, like "TV home screens") gets 4 to 8 items. A visitor ticks items under "Must have" to filter, and each project answers yes / partly / no.

Rules for an item:
1. It changes someone's choice: something a person checks before picking, or regrets after.
2. It splits the field: if every project would say yes, leave it out (unless every one says no and that is a real gap).
3. It can be checked from the project's own website or docs. Never "easy to use", "fast", "polished".
4. One question per item. 5. Written for a non-technical person; no jargon without plain words.
6. It means the same thing everywhere it appears, so a project answers it once.
Order: the item switchers ask about most comes first. Small groups (1-3 projects) get 4 or 5 items; bigger ones up to 8.

Reuse these shared items whenever they fit, by id (do not redefine them):
${shared}

For a new item give: id (lowercase-with-dashes, not one of the ids above), name (2-5 words, sentence case), question (one plain question ending in "?"),
meaning (the form "Yes: …; partly: …; no: …").`;
const SCHEMA = { type: 'object', additionalProperties: false, required: ['groups', 'newTags'], properties: {
  groups: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['group', 'tags'], properties: { group: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } } } },
  newTags: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'name', 'question', 'meaning'],
    properties: { id: { type: 'string' }, name: { type: 'string' }, question: { type: 'string' }, meaning: { type: 'string' } } } } } };

const byCat = new Map(); for (const g of todo) (byCat.get(g.category) ?? byCat.set(g.category, []).get(g.category)).push(g);
const describe = (g) => `## ${g.id}: ${g.name}\nJob: ${g.job}.${g.closed.length ? ` Stands in for: ${g.closed.join(', ')}.` : ''}\nProjects:\n` +
  g.alternatives.map((a) => { const p = projects.get(a.project); return `- ${p.name}: ${p.summary}`; }).join('\n');
const msgFor = (cid, gs) => `Category: ${cats.get(cid)}. Design the checklist for each group below.\n\n${gs.map(describe).join('\n\n')}`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? readFileSync(join(homedir(), '.config/alternatives-map/anthropic-key'), 'utf8').trim(), maxRetries: 4 });
const MODEL = 'claude-opus-5-5';
if (process.argv.includes('--count')) {
  let tokens = 0; for (const [cid, gs] of byCat) tokens += (await client.messages.countTokens({ model: MODEL, system: SYSTEM, messages: [{ role: 'user', content: msgFor(cid, gs) }] })).input_tokens;
  // Opus 5.5: $4 per million input, $20 per million output; output estimated at ~250 tokens per group.
  console.log(`${todo.length} groups in ${byCat.size} requests; ${tokens} input tokens; estimate $${((tokens * 4 + todo.length * 250 * 20) / 1e6).toFixed(2)}`);
  process.exit(0);
}

const out = { groups: {}, tags: {} }; let inTok = 0, outTok = 0; const problems = [];
// WHY 4 at a time (Oct 27): the account's key allows only a few requests at once; 26 together were refused with a 429.
const jobs = [...byCat]; const failed = [];
await Promise.all(Array.from({ length: 4 }, async () => { for (let j = jobs.shift(); j; j = jobs.shift()) { const [cid, gs] = j;
  let res;
  try {
    res = await client.messages.stream({ model: MODEL, max_tokens: 16000, system: SYSTEM,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: msgFor(cid, gs) }] }).finalMessage();
  } catch (e) { failed.push(`${cid}: ${String(e).slice(0, 80)}`); continue; }
  inTok += res.usage.input_tokens; outTok += res.usage.output_tokens;
  const a = JSON.parse(res.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
  for (const t of a.newTags) {
    if (existingIds.has(t.id)) { problems.push(`${cid}: new item ${t.id} reuses an existing id; kept the existing one`); continue; }
    out.tags[t.id] = { name: t.name, question: t.question, meaning: t.meaning };
  }
  for (const g of a.groups) if (gs.some((x) => x.id === g.group)) out.groups[g.group] = g.tags;
} }));
if (failed.length) problems.push(...failed.map((f) => `request failed: ${f}`));
// WHY a strict check: an item a group names must exist (shared or newly defined), or the page would show a blank row.
for (const [gid, tags] of Object.entries(out.groups)) {
  const ok = tags.filter((t) => existingIds.has(t) || out.tags[t]);
  if (ok.length !== tags.length) problems.push(`${gid}: dropped unknown items ${tags.filter((t) => !ok.includes(t)).join(', ')}`);
  out.groups[gid] = ok;
}
const missing = todo.filter((g) => !out.groups[g.id]?.length).map((g) => g.id);
writeFileSync(join(HERE, 'out/new-group-checklists.json'), JSON.stringify({ ...out, problems, missing }, null, 1));
console.log(`${Object.keys(out.groups).length} groups, ${Object.keys(out.tags).length} new items; $${((inTok * 4 + outTok * 20) / 1e6).toFixed(2)}; missing: ${missing.join(', ') || 'none'}; notes: ${problems.length}`);
