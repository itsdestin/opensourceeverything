// Checklists for the new groups, step B (paid, Claude Haiku 5.5): answer each new group's checklist for each of its projects,
// from the project's own README. Writes prefill/out/new-group-answers.json; merge-checklists.mjs then adds them to data/features.json.
// Run: GH_TOKEN=$(gh auth token) node prefill/new-group-answers.mjs [--count]
//
// WHY blank when unsure (Destin's checklist deck: answers filled in at the start, people confirm or dispute later): a wrong "yes"
// misleads a "Must have" filter; a blank only says "not checked yet". The model must quote the README for every yes / partly / no.
// WHY one request per project with all its new groups' items: a project in two groups answers shared items once.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseCode } from './hosts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const CACHE = join(HERE, '.cache', 'readmes'); mkdirSync(CACHE, { recursive: true });
const GH = process.env.GH_TOKEN;
if (!GH) { console.error('Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token)).'); process.exit(1); }
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const features = read(join(ROOT, 'data/features.json'));
const lists = read(join(HERE, 'out/new-group-checklists.json'));
const tagDef = (t) => lists.tags[t] ?? features.tags[t];
const groups = read(join(ROOT, 'data/groups.json')).groups.filter((g) => lists.groups[g.id]);
const projects = new Map(read(join(ROOT, 'data/projects.json')).projects.map((p) => [p.id, p]));

// Per project: every item from every new group it is in, minus items it already answered in the first research pass.
const need = new Map();
for (const g of groups) for (const a of g.alternatives) {
  const s = need.get(a.project) ?? new Set();
  for (const t of lists.groups[g.id]) if (!features.answers[a.project]?.[t]) s.add(t);
  need.set(a.project, s);
}
const todo = [...need].filter(([, s]) => s.size).map(([id, s]) => ({ p: projects.get(id), tags: [...s] })).filter((x) => x.p);

const SYSTEM = `You fill in a feature checklist for one open-source project, for a public map read by everyday people.
For each item answer from the material given only (the project's README and summary):
- v: "yes", "partly" or "no", following the item's meaning; or "unknown" if the material doesn't clearly say. Prefer "unknown" over a guess.
  Answer "no" only when the material makes it clear (e.g. "Windows only" answers "Phone app: no"; a command-line tool answers "No commands needed: no").
- note: for "partly" (and optionally "no"), under 70 characters in plain words; otherwise null.
- quote: for yes / partly / no, a short exact phrase from the material that backs it; null for unknown.`;
const SCHEMA = { type: 'object', additionalProperties: false, required: ['answers'], properties: { answers: { type: 'array', items: {
  type: 'object', additionalProperties: false, required: ['tag', 'v', 'note', 'quote'], properties: {
    tag: { type: 'string' }, v: { type: 'string', enum: ['yes', 'partly', 'no', 'unknown'] }, note: { anyOf: [{ type: 'string' }, { type: 'null' }] }, quote: { anyOf: [{ type: 'string' }, { type: 'null' }] } } } } } };

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
async function getText(url, headers = {}) { try { const r = await fetch(url, { headers: { 'User-Agent': 'opensourceeverything', ...headers }, signal: AbortSignal.timeout(15_000) }); return r.ok ? r.text() : ''; } catch { return ''; } }
// WHY reuse the review step's cache: the same README was already fetched for the summary (new-<name>.json).
async function readme(p) {
  const file = join(CACHE, `new-${norm(p.name)}.json`);
  if (existsSync(file)) return read(file).readme;
  const pc = parseCode(p.code); let t = '';
  if (pc?.host === 'github.com') t = await getText(`https://api.github.com/repos/${pc.path}/readme`, { Authorization: `Bearer ${GH}`, Accept: 'application/vnd.github.raw+json' });
  else if (pc) t = await getText(`https://${pc.host}/${pc.path}/-/raw/HEAD/README.md`) || await getText(`https://${pc.host}/${pc.path}/raw/branch/main/README.md`);
  t = t.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').slice(0, 10_000);
  writeFileSync(file, JSON.stringify({ readme: t, license: '' }));
  return t;
}
const sourceOf = (p) => (p.code ? `https://${p.code.replace(/^https?:\/\//, '')}` : p.website);
const input = (x, md) => `Project: ${x.p.name}\nSummary: ${x.p.summary}\nDevices found: ${(x.p.platforms ?? []).join(', ') || 'none found'}\n\nItems:\n` +
  x.tags.map((t) => `- ${t}: ${tagDef(t).name}. ${tagDef(t).question} (${tagDef(t).meaning})`).join('\n') + `\n\nREADME (start):\n${md || '(no README found)'}`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? readFileSync(join(homedir(), '.config/alternatives-map/anthropic-key'), 'utf8').trim(), maxRetries: 6 });
const MODEL = 'claude-haiku-5-5';
if (process.argv.includes('--count')) {
  let tokens = 0; const sample = todo.slice(0, 30);
  for (const x of sample) tokens += (await client.messages.countTokens({ model: MODEL, system: SYSTEM, messages: [{ role: 'user', content: input(x, await readme(x.p)) }] })).input_tokens;
  const per = tokens / sample.length;
  console.log(`${todo.length} projects, ${todo.reduce((s, x) => s + x.tags.length, 0)} answers; ~${Math.round(per)} input tokens each; estimate $${((per * todo.length * 0.10 + 400 * todo.length * 0.50) / 1e6).toFixed(2)}`);
  process.exit(0);
}

// WHY 4 at a time: the account's key refuses more concurrent requests (429 on Oct 27).
const out = {}; const queue = [...todo]; let done = 0, inTok = 0, outTok = 0, failed = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let x = queue.shift(); x; x = queue.shift()) {
    try {
      const res = await client.messages.create({ model: MODEL, max_tokens: 3000, system: SYSTEM,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        messages: [{ role: 'user', content: input(x, await readme(x.p)) }] });
      inTok += res.usage.input_tokens; outTok += res.usage.output_tokens;
      const a = JSON.parse(res.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
      for (const r of a.answers) {
        if (!x.tags.includes(r.tag) || r.v === 'unknown' || !r.quote) continue; // WHY: no quote, no answer
        (out[x.p.id] ??= {})[r.tag] = { v: r.v, ...(r.note ? { note: r.note } : {}), source: sourceOf(x.p) };
      }
    } catch { failed++; }
    if (++done % 50 === 0) console.log(`${done}/${todo.length}`);
  }
}));
writeFileSync(join(HERE, 'out/new-group-answers.json'), JSON.stringify(out, null, 1));
const n = Object.values(out).reduce((s, a) => s + Object.keys(a).length, 0);
console.log(`${done} projects, ${failed} failed; ${n} answers filled of ${todo.reduce((s, x) => s + x.tags.length, 0)} asked; $${((inTok * 0.10 + outTok * 0.50) / 1e6).toFixed(2)}`);
