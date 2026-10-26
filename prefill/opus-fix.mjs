// Correction pass (paid, ~$5.50): Claude Opus 5.5 reviews every listing against the project's own page and
// says whether to keep it, the right fit (full / partial) and a corrected description if needed.
// Writes prefill/out/opus-fix.json, which assemble.mjs applies; every change carries its reason so a mod can
// see what changed and why. Run: GH_TOKEN=$(gh auth token) node prefill/opus-fix.mjs  then  node prefill/assemble.mjs
//
// WHY a corrections file instead of editing data/*.json: assemble.mjs rebuilds those from scratch, and the
// fixes must survive a rebuild.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
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
if (existsSync(join(OUT, 'opus-fix.json'))) { console.error('opus-fix.json already exists; delete it to run again.'); process.exit(1); }
// WHY read the pre-fix data: assemble.mjs must run without opus-fix.json first, or fixes would be judged against fixed data.
const projects = new Map(read('data/projects.json').projects.map((p) => [p.id, p]));
const groups = read('data/groups.json').groups;
const listings = groups.flatMap((g) => g.alternatives.map((a) => ({ g, a, p: projects.get(a.project) })));

const pages = new Map();
async function text(url, raw) {
  try {
    const r = await fetch(url, { headers: raw ? { Authorization: `Bearer ${GH}`, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'alternatives-map' } : { 'User-Agent': 'alternatives-map' }, signal: AbortSignal.timeout(15_000) });
    return r.ok ? r.text() : '';
  } catch { return ''; }
}
async function page(p) {
  if (pages.has(p.id)) return pages.get(p.id);
  const c = p.code ?? ''; let t = '';
  if (c.startsWith('github.com/')) t = await text(`https://api.github.com/repos/${c.slice(11)}/readme`, true);
  else if (c.startsWith('gitlab.com/')) t = await text(`https://gitlab.com/${c.slice(11)}/-/raw/HEAD/README.md`);
  else if (c.startsWith('codeberg.org/')) t = await text(`https://codeberg.org/${c.slice(13)}/raw/branch/main/README.md`);
  else if (p.website) t = (await text(p.website)).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ');
  t = t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8_000);
  pages.set(p.id, t);
  return t;
}

const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['keep', 'fit', 'summary', 'reason'],
  properties: {
    keep: { type: 'boolean' },
    fit: { type: 'string', enum: ['full', 'partial'] },
    summary: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    reason: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  },
};
const SYSTEM = `You correct listings on a public map of open-source alternatives to closed-source apps, read by non-technical people. Judge from the project's own page and general knowledge of well-known software.
- keep: false only if this project is not a real open-source alternative for this group's job (wrong kind of tool, or the useful part is a closed hosted service).
- fit: "full" if it does the main job of the group's closed apps; "partial" if it covers only some of it. Don't undersell: a complete self-hosted equivalent is "full" even if the closed app has extra polish.
- summary: null if the current description is accurate and neutral. Otherwise a corrected one: two short plain sentences, what it is and who it's for, no marketing words, nothing the page doesn't support.
- reason: null if nothing changes; otherwise one short sentence saying what you changed and why.`;

async function fix({ g, a, p }) {
  const res = await client.messages.create({
    model: 'claude-opus-5-5', max_tokens: 8000, system: SYSTEM,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: `Group: ${g.name} — ${g.job}. Closed apps it replaces: ${g.closed.slice(0, 8).join(', ')}\n` +
      `Listing: ${p.name} (${p.code ?? p.website}). Current fit: ${a.fit}${a.note ? ` (note: ${a.note})` : ''}\nCurrent description: ${p.summary}\n\nProject page (start):\n${await page(p) || '(could not load)'}` }],
  });
  const t = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { group: g.id, project: p.id, name: p.name, before: a.fit, verdict: res.stop_reason === 'end_turn' ? JSON.parse(t) : null, stop: res.stop_reason, usage: res.usage };
}

const results = []; const queue = [...listings]; const started = Date.now(); let n = 0;
await Promise.all(Array.from({ length: 16 }, async () => {
  for (let x = queue.shift(); x; x = queue.shift()) {
    try { results.push(await fix(x)); } catch (e) { results.push({ group: x.g.id, project: x.p.id, name: x.p.name, error: String(e).slice(0, 200) }); }
    if (++n % 50 === 0) console.log(`${n}/${listings.length}`);
  }
}));
writeFileSync(join(OUT, 'opus-fix.json'), JSON.stringify(results, null, 1));

const ok = results.filter((r) => r.verdict);
const cost = results.reduce((s, r) => s + ((r.usage?.input_tokens ?? 0) * 4 + (r.usage?.output_tokens ?? 0) * 20) / 1e6, 0);
const removed = ok.filter((r) => !r.verdict.keep);
const msg = `
## Correction pass by Claude Opus 5.5 (${new Date().toISOString().slice(0, 10)})

- Reviewed **${ok.length}** of ${listings.length} listings in ${Math.round((Date.now() - started) / 1000)} seconds for **$${cost.toFixed(2)}** (${results.length - ok.length} failed; those stay as they were).
- Removed: **${removed.length}** (${removed.map((r) => r.name).join(', ')}).
- Fit changed: **${ok.filter((r) => r.verdict.keep && r.verdict.fit !== r.before).length}** (partial → full: ${ok.filter((r) => r.verdict.keep && r.before === 'partial' && r.verdict.fit === 'full').length}; full → partial: ${ok.filter((r) => r.verdict.keep && r.before === 'full' && r.verdict.fit === 'partial').length}).
- Descriptions rewritten: **${ok.filter((r) => r.verdict.keep && r.verdict.summary).length}**.
`;
appendFileSync(join(OUT, 'summary.md'), msg);
console.log(msg);
