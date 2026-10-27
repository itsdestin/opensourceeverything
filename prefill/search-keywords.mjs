// Search keywords (paid, small): one Claude request per group and per project, asking for the short phrases a
// person might type when looking for it. The search box (site/assets/search-core.js) matches these like a
// description, so "privacy phone" finds GrapheneOS even though neither word is in its name.
// Run:  node prefill/search-keywords.mjs --count          free: exact token count and price, no requests made
//       node prefill/search-keywords.mjs [--model haiku] [--only id,id]
// Output: data/search-keywords.json  { groups: {id: [phrases]}, projects: {id: [phrases]} } — reviewable,
// hand-editable, and kept between runs (--only redoes just those ids).
//
// WHY generated once at build time, not per search: visitors never wait on an AI, nothing they type leaves
// their browser, and the cost is paid once per data change.
// WHY the model never sees the search tests: the tests in site/test/ must stay a fair measure.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const KEY_FILE = join(homedir(), '.config', 'alternatives-map', 'anthropic-key');
const apiKey = process.env.ANTHROPIC_API_KEY ?? (existsSync(KEY_FILE) ? readFileSync(KEY_FILE, 'utf8').trim() : '');
if (!apiKey) { console.error(`No key: put it in ${KEY_FILE}`); process.exit(1); }
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const COUNT = process.argv.includes('--count');
// Prices per million tokens (input, output), as used by the other prefill scripts.
const MODELS = { opus: { id: 'claude-opus-5-5', in: 4, out: 20 }, haiku: { id: 'claude-haiku-5-5', in: 0.10, out: 0.50 } };
const M = MODELS[arg('--model') ?? 'opus'];
const ONLY = arg('--only')?.split(',');
const OUT_FILE = join(ROOT, 'data', 'search-keywords.json');

const client = new Anthropic({ apiKey, maxRetries: 4 });
const { groups } = JSON.parse(readFileSync(join(ROOT, 'data/groups.json'), 'utf8'));
const { projects } = JSON.parse(readFileSync(join(ROOT, 'data/projects.json'), 'utf8'));
const { categories } = JSON.parse(readFileSync(join(ROOT, 'data/categories.json'), 'utf8'));
const catName = new Map(categories.map((c) => [c.id, c.name]));
const groupsOf = new Map();
for (const g of groups) for (const a of g.alternatives) groupsOf.set(a.project, [...(groupsOf.get(a.project) ?? []), { g, a }]);

const SYSTEM = `You write search keywords for a website that lists open-source replacements for closed-source apps. Visitors are ordinary people, not developers. They type what they need into a search box, often vaguely: a need ("keep my photos off google"), a feature ("works offline", "no account"), a situation ("for my small business"), a comparison ("like notion but private"), or a casual description of the app's job.

For the item given, write 12 to 20 short phrases (1 to 5 words each, lowercase, no punctuation) that such a person might type when this item is what they're looking for.
- Cover: what it does in everyday words, synonyms for its job, the needs and situations it fits, its notable features or qualities (privacy, offline, self-hosted, no account, free, encrypted, which devices) — only if the information given supports them.
- Include the closed apps it stands in for only when phrased as a need ("youtube without ads", "google drive replacement"); plain names are already searchable.
- Do not include the item's own name, its group name, or generic words alone ("app", "software", "free", "open source").
- Never invent features. If unsure, leave it out.`;
const SCHEMA = { type: 'object', properties: { phrases: { type: 'array', items: { type: 'string' } } }, required: ['phrases'], additionalProperties: false };

function describe(kind, x) {
  if (kind === 'group') {
    const alts = x.alternatives.map((a) => projects.find((p) => p.id === a.project)?.name).filter(Boolean);
    return `A GROUP PAGE (a job, listing its open-source options).\nName: ${x.name}\nJob: ${x.job}\nCategory: ${catName.get(x.category)}\n` +
      `Closed apps it covers: ${x.closed.join(', ')}\nOpen-source options listed: ${alts.join(', ')}`;
  }
  const gs = groupsOf.get(x.id) ?? [];
  return `AN OPEN-SOURCE PROJECT.\nName: ${x.name}\nSummary: ${x.summary}\nKind: ${x.kind}\nRuns on: ${(x.platforms ?? []).join(', ') || 'not recorded'}\n` +
    `Listed under: ${gs.map(({ g, a }) => `${g.name} (${g.job}; replaces ${g.closed.join(', ')}; ${a.fit === 'full' ? 'a full replacement' : 'a partial replacement'}${a.note ? `; ${a.note}` : ''})`).join(' | ')}`;
}

const jobs = [
  ...groups.map((g) => ({ kind: 'group', id: g.id, text: describe('group', g) })),
  ...projects.map((p) => ({ kind: 'project', id: p.id, text: describe('project', p) })),
].filter((j) => !ONLY || ONLY.includes(j.id));

const request = (j) => ({
  model: M.id, max_tokens: 2000, system: SYSTEM,
  // WHY low effort: short lists from given facts; deeper reasoning would cost more for little gain.
  output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
  messages: [{ role: 'user', content: j.text }],
});

async function pool(list, fn, n = 16) {
  const out = []; const q = [...list]; let done = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    for (let j = q.shift(); j; j = q.shift()) {
      try { out.push(await fn(j)); } catch (e) { out.push({ ...j, error: e instanceof Anthropic.APIError ? `${e.status} ${e.name}` : String(e) }); }
      if (++done % 50 === 0) console.log(`${done}/${list.length}`);
    }
  }));
  return out;
}

if (COUNT) {
  // Free: the token-counting endpoint costs nothing. Output is estimated at 150 tokens per item (20 short phrases).
  const counted = await pool(jobs, async (j) => {
    const { model, system, messages } = request(j);
    return { ...j, tokens: (await client.messages.countTokens({ model, system, messages })).input_tokens };
  });
  const failed = counted.filter((c) => c.error);
  const inTok = counted.reduce((s, c) => s + (c.tokens ?? 0), 0);
  const outTok = jobs.length * 150;
  for (const [k, m] of Object.entries(MODELS)) console.log(`${k.padEnd(6)} ${jobs.length} requests, ${inTok.toLocaleString()} input tokens, ~${outTok.toLocaleString()} output → ~$${((inTok * m.in + outTok * m.out) / 1e6).toFixed(2)}`);
  if (failed.length) console.log(`(${failed.length} couldn't be counted: ${failed[0].error})`);
  process.exit(0);
}

const started = Date.now();
const results = await pool(jobs, async (j) => {
  const res = await client.messages.create(request(j));
  if (res.stop_reason !== 'end_turn') return { ...j, error: res.stop_reason, usage: res.usage };
  const t = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  // WHY clean here: keep only plain short phrases, so a stray long sentence can't swamp the search.
  const phrases = [...new Set(JSON.parse(t).phrases.map((p) => p.toLowerCase().replace(/[^a-z0-9 +'-]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p && p.split(' ').length <= 6))];
  return { ...j, phrases, usage: res.usage };
});

const prev = existsSync(OUT_FILE) ? JSON.parse(readFileSync(OUT_FILE, 'utf8')) : { groups: {}, projects: {} };
const out = { _about: `Search phrases per group and project, written by ${M.id} via prefill/search-keywords.mjs. Edit freely; the search box reads them like descriptions.`, groups: { ...prev.groups }, projects: { ...prev.projects } };
for (const r of results) if (r.phrases) out[r.kind === 'group' ? 'groups' : 'projects'][r.id] = r.phrases;
writeFileSync(OUT_FILE, JSON.stringify(out, null, 1) + '\n');
const inTok = results.reduce((s, r) => s + (r.usage?.input_tokens ?? 0), 0), outTok = results.reduce((s, r) => s + (r.usage?.output_tokens ?? 0), 0);
const bad = results.filter((r) => r.error);
console.log(`${results.length - bad.length}/${results.length} done in ${Math.round((Date.now() - started) / 1000)}s for $${((inTok * M.in + outTok * M.out) / 1e6).toFixed(2)} (${inTok.toLocaleString()} in, ${outTok.toLocaleString()} out)`);
if (bad.length) console.log(`failed: ${bad.map((b) => `${b.id} (${b.error})`).join(', ')}`);
