// Quality check (paid, ~$2-3): Claude Opus 5.5 judges 100 random listings against each project's own page,
// in place of a human spot check (Destin, Oct 27: "just spot check with an opus model").
// Run: GH_TOKEN=$(gh auth token) node prefill/opus-check.mjs   Output: prefill/out/opus-check.json + summary.md
//
// WHY a stronger model than the one that did the sorting: a check by the same model repeats its blind spots.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(HERE, 'out');
const apiKey = process.env.ANTHROPIC_API_KEY ?? readFileSync(join(homedir(), '.config/alternatives-map/anthropic-key'), 'utf8').trim();
const GH = process.env.GH_TOKEN;
if (!GH) { console.error('Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token)).'); process.exit(1); }
const client = new Anthropic({ apiKey, maxRetries: 4 });
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const projects = new Map(read('data/projects.json').projects.map((p) => [p.id, p]));
const groups = read('data/groups.json').groups;

// WHY a seed argument: a re-check after a fix uses a fresh sample, not the one the fix was tuned on.
let seed = Number(process.argv[2] ?? 7);
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const all = groups.flatMap((g) => g.alternatives.map((a) => ({ g, a, p: projects.get(a.project) })));
const sample = []; const pool = [...all];
while (sample.length < 100 && pool.length) sample.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);

async function text(url, raw) {
  try {
    const r = await fetch(url, { headers: raw ? { Authorization: `Bearer ${GH}`, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'openinstead' } : { 'User-Agent': 'openinstead' }, signal: AbortSignal.timeout(15_000) });
    return r.ok ? r.text() : '';
  } catch { return ''; }
}
async function page(p) {
  const c = p.code ?? '';
  let t = '';
  if (c.startsWith('github.com/')) t = await text(`https://api.github.com/repos/${c.slice(11)}/readme`, true);
  else if (c.startsWith('gitlab.com/')) t = await text(`https://gitlab.com/${c.slice(11)}/-/raw/HEAD/README.md`);
  else if (c.startsWith('codeberg.org/')) t = await text(`https://codeberg.org/${c.slice(13)}/raw/branch/main/README.md`);
  else if (p.website) t = (await text(p.website)).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  return t.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 8_000);
}

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['groupRight', 'fitRight', 'descriptionRight', 'problem'],
  properties: {
    groupRight: { type: 'boolean' }, fitRight: { type: 'boolean' }, descriptionRight: { type: 'boolean' },
    problem: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
};
const SYSTEM = `You check listings on a public map of open-source alternatives to closed-source apps. Be strict but fair; judge from the project's own page and general knowledge of well-known software.
- groupRight: does this project really do this group's job, as an alternative to its closed apps?
- fitRight: "full" means it does the main job of those closed apps; "partial" means it covers some of it. Is the stated fit reasonable?
- descriptionRight: is the two-sentence description accurate and neutral?
- problem: if anything is false, one short sentence saying what; otherwise null.`;

async function judge({ g, a, p }) {
  const res = await client.messages.create({
    model: 'claude-opus-5-5', max_tokens: 8000, system: SYSTEM,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: `Group: ${g.name} — ${g.job}. Closed apps it replaces: ${g.closed.slice(0, 8).join(', ')}\n` +
      `Listing: ${p.name} (${p.code ?? p.website}). Fit: ${a.fit}${a.note ? ` (${a.note})` : ''}\nDescription: ${p.summary}\n\nProject page (start):\n${await page(p) || '(could not load)'}` }],
  });
  const t = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { group: g.id, project: p.id, name: p.name, fit: a.fit, source: p.source, verdict: res.stop_reason === 'end_turn' ? JSON.parse(t) : null, usage: res.usage };
}

const results = []; const queue = [...sample]; const started = Date.now();
await Promise.all(Array.from({ length: 16 }, async () => {
  for (let x = queue.shift(); x; x = queue.shift()) {
    try { results.push(await judge(x)); } catch (e) { results.push({ name: x.p.name, error: String(e).slice(0, 200) }); }
  }
}));
writeFileSync(join(OUT, 'opus-check.json'), JSON.stringify(results, null, 1));

const ok = results.filter((r) => r.verdict);
const pct = (fn, list = ok) => `${Math.round(list.filter(fn).length / Math.max(1, list.length) * 100)}%`;
const bySource = (s) => ok.filter((r) => r.source === s);
const cost = results.reduce((s, r) => s + ((r.usage?.input_tokens ?? 0) * 4 + (r.usage?.output_tokens ?? 0) * 20) / 1e6, 0);
const allRight = (r) => r.verdict.groupRight && r.verdict.fitRight && r.verdict.descriptionRight;
const msg = `
## Quality check by Claude Opus 5.5 (${new Date().toISOString().slice(0, 10)})

- Judged **${ok.length}** random listings in ${Math.round((Date.now() - started) / 1000)} seconds for **$${cost.toFixed(2)}** (${results.length - ok.length} failed).
- Fully right: **${pct(allRight)}**. Right group: ${pct((r) => r.verdict.groupRight)} · right fit: ${pct((r) => r.verdict.fitRight)} · right description: ${pct((r) => r.verdict.descriptionRight)}.
- Hand-picked starter listings fully right: ${pct(allRight, bySource('starter'))} of ${bySource('starter').length}; from the free lists: ${pct(allRight, bySource('lists'))} of ${bySource('lists').length}.
`;
appendFileSync(join(OUT, 'summary.md'), msg);
console.log(msg);
for (const r of ok.filter((r) => !allRight(r))) console.log(`- ${r.name} in ${r.group} (${r.fit}, ${r.source}): ${r.verdict.problem}`);
