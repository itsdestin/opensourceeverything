// Step 3 of the pre-fill (paid, ~$0.50 for ~430 projects): one Claude Haiku 5.5 request per project from
// the free lists, many at once. Each reads the project's README (and license file when GitHub couldn't
// classify it) and returns a fixed-shape answer: a neutral summary, which named closed apps it really
// replaces, its license class, and which starter group(s) it belongs in.
// Run: node prefill/ai-review.mjs [--limit N]      Output: prefill/out/ai-review.json + summary.md
//
// WHY direct requests, 16 at a time, not the half-price Batch API: Destin wants it fast (Oct 27); a batch
// can take up to an hour, this takes minutes for roughly double a very small cost.
// WHY the key comes from a file: never typed into chat or saved in the repo.

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(HERE, 'out');
const CACHE = join(HERE, '.cache', 'readmes'); mkdirSync(CACHE, { recursive: true });
const KEY_FILE = join(homedir(), '.config', 'alternatives-map', 'anthropic-key');
const apiKey = process.env.ANTHROPIC_API_KEY ?? (existsSync(KEY_FILE) ? readFileSync(KEY_FILE, 'utf8').trim() : '');
if (!apiKey) { console.error(`No key: put it in ${KEY_FILE}`); process.exit(1); }
const GH = process.env.GH_TOKEN;
if (!GH) { console.error('Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token)).'); process.exit(1); }
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;
const MODEL = 'claude-haiku-5-5';
const CONCURRENCY = 16;

const client = new Anthropic({ apiKey, maxRetries: 4 });
const { projects } = JSON.parse(readFileSync(join(OUT, 'candidates.json'), 'utf8'));
const facts = new Map(JSON.parse(readFileSync(join(OUT, 'facts.json'), 'utf8')).map((f) => [f.id, f]));
const starter = JSON.parse(readFileSync(join(ROOT, 'data/starter.json'), 'utf8'));

// Skip what the hand-picked starter set already covers, and anything known not to be open source.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const inStarter = new Set();
for (const c of starter.categories) for (const g of c.groups) for (const [name, link] of g.alts) { inStarter.add(norm(name)); inStarter.add(norm(link.replace(/^https?:\/\//, ''))); }
for (const x of starter.excluded.projects) { inStarter.add(norm(x.name)); inStarter.add(norm(x.link)); }
const todo = projects.filter((p) => {
  if (!p.repo || inStarter.has(norm(p.name)) || inStarter.has(norm(p.repo))) return false;
  const f = facts.get(p.id);
  if (p.repo.startsWith('github.com/')) return f?.found && f.licenseVerdict !== 'missing';
  return true; // GitLab / Codeberg: their license is read from the README by the model and checked by a person
}).slice(0, LIMIT);

const GROUPS = starter.categories.flatMap((c) => c.groups.map((g) => `${g.id}: ${g.name} (${c.name}) — ${g.job}; replaces ${g.closed.join(', ')}`)).join('\n');
const SYSTEM = `You help build a public map of open-source alternatives to closed-source apps, for the r/TrueOpenSource community.
You get one open-source project: its README, sometimes its license file, and the closed apps that community lists say it replaces.
Answer only from the material given. If something isn't stated there, say so in "unconfirmed" rather than guessing.

Existing groups (id: name (category) — job; closed apps):
${GROUPS}

Rules:
- summary: two short, neutral, plain-language sentences a non-technical person understands. What it is and who it's for. No marketing words ("blazing", "powerful", "best").
- replaces: one entry per closed app named in the input. fit "full" = does that app's main job; "partial" = covers some of it; "no" = the list was wrong.
- kind: "app" (people use it directly, on a computer, phone or web), "self_hosted" (you run it on your own server, people use it in a browser), "developer_tool" (for programmers or IT), "library" (code other programs use).
- license.verdict: when "License reported by its host" is an OSI-approved license and nothing you were given contradicts it, answer "open" (the license file is only sent when the host couldn't tell). Otherwise: "open" (an OSI-approved license for the whole project), "open_core" (open, with paid or differently licensed parts), "not_open" (source-available or restrictive), "unclear".
- groups: ids from the list above that fit its job. If none fit, leave it empty and propose newGroup (a short job name, e.g. "Feature flags").`;

const SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['summary', 'replaces', 'kind', 'license', 'groups', 'newGroup', 'unconfirmed'],
  properties: {
    summary: { type: 'string' },
    replaces: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['closedApp', 'fit', 'reason'],
      properties: { closedApp: { type: 'string' }, fit: { type: 'string', enum: ['full', 'partial', 'no'] }, reason: { type: 'string' } } } },
    kind: { type: 'string', enum: ['app', 'self_hosted', 'developer_tool', 'library'] },
    license: { type: 'object', additionalProperties: false, required: ['verdict', 'note'],
      properties: { verdict: { type: 'string', enum: ['open', 'open_core', 'not_open', 'unclear'] }, note: { type: 'string' } } },
    groups: { type: 'array', items: { type: 'string' } },
    newGroup: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    unconfirmed: { type: 'array', items: { type: 'string' } },
  },
};

async function ghText(path) {
  const res = await fetch(`https://api.github.com/repos/${path}`, { headers: { Authorization: `Bearer ${GH}`, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'alternatives-map' } });
  return res.ok ? res.text() : '';
}
async function rawText(url) { try { const r = await fetch(url, { signal: AbortSignal.timeout(15_000) }); return r.ok ? r.text() : ''; } catch { return ''; } }
async function material(p) {
  const file = join(CACHE, `${norm(p.id)}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const [host, owner, name] = p.repo.split('/');
  let readme = '', license = '';
  if (host === 'github.com') {
    readme = await ghText(`${owner}/${name}/readme`);
    if (facts.get(p.id)?.licenseVerdict !== 'open') license = await ghText(`${owner}/${name}/license`);
  } else if (host === 'gitlab.com') {
    readme = await rawText(`https://gitlab.com/${owner}/${name}/-/raw/HEAD/README.md`);
  } else {
    readme = await rawText(`https://codeberg.org/${owner}/${name}/raw/branch/main/README.md`);
  }
  // WHY trim: the opening of a README says what the project is; install steps further down cost tokens and add nothing.
  const m = { readme: readme.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').slice(0, 12_000), license: license.slice(0, 3_000) };
  writeFileSync(file, JSON.stringify(m));
  return m;
}

async function review(p) {
  const m = await material(p);
  const f = facts.get(p.id);
  const input = `Project: ${p.name}\nCode: ${p.repo}\nLicense reported by its host: ${f?.license ?? 'not reported'}\n` +
    `Closed apps the lists say it replaces: ${p.replaces.map((r) => r.name).join(', ')}\n` +
    `Descriptions from the lists:\n${p.descriptions.map((d) => `- ${d.text}`).join('\n') || '- none'}\n\n` +
    `README (start):\n${m.readme || '(no README found)'}\n` + (m.license ? `\nLicense file (start):\n${m.license}\n` : '');
  const res = await client.messages.create({
    model: MODEL, max_tokens: 4000, system: SYSTEM,
    // WHY low effort: a short extraction task; deeper reasoning costs more and adds little here.
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    messages: [{ role: 'user', content: input }],
  });
  if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') return { id: p.id, error: res.stop_reason, usage: res.usage };
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { id: p.id, name: p.name, repo: p.repo, answer: JSON.parse(text), usage: res.usage };
}

const results = []; const queue = [...todo]; let done = 0;
const started = Date.now();
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let p = queue.shift(); p; p = queue.shift()) {
    try { results.push(await review(p)); }
    catch (e) { results.push({ id: p.id, error: e instanceof Anthropic.APIError ? `${e.status} ${e.name}` : String(e) }); }
    if (++done % 25 === 0) console.log(`${done}/${todo.length}`);
  }
}));

// Haiku 5.5: $0.10 per million input tokens, $0.50 per million output (prompts under 100K tokens).
const inTok = results.reduce((s, r) => s + (r.usage?.input_tokens ?? 0), 0);
const outTok = results.reduce((s, r) => s + (r.usage?.output_tokens ?? 0), 0);
const cost = (inTok * 0.10 + outTok * 0.50) / 1e6;
writeFileSync(join(OUT, 'ai-review.json'), JSON.stringify(results, null, 1));
const ok = results.filter((r) => r.answer);
const by = (fn) => ok.filter(fn).length;
const newGroups = {};
for (const r of ok) if (r.answer.newGroup) newGroups[r.answer.newGroup] = (newGroups[r.answer.newGroup] ?? 0) + 1;
const text = `
## Step 3: AI review (${new Date().toISOString().slice(0, 10)}, ${MODEL})

- Reviewed **${ok.length}** of ${todo.length} projects in ${Math.round((Date.now() - started) / 1000)} seconds; ${results.length - ok.length} failed.
- Cost: **$${cost.toFixed(2)}** (${inTok.toLocaleString()} tokens read, ${outTok.toLocaleString()} written).
- License: ${by((r) => r.answer.license.verdict === 'open')} open, ${by((r) => r.answer.license.verdict === 'open_core')} open core, ${by((r) => r.answer.license.verdict === 'not_open')} not open, ${by((r) => r.answer.license.verdict === 'unclear')} unclear.
- Kind: ${by((r) => r.answer.kind === 'app')} apps, ${by((r) => r.answer.kind === 'self_hosted')} self-hosted, ${by((r) => r.answer.kind === 'developer_tool')} developer tools, ${by((r) => r.answer.kind === 'library')} libraries.
- Pairings the AI says the lists got wrong ("no"): ${ok.reduce((s, r) => s + r.answer.replaces.filter((x) => x.fit === 'no').length, 0)}.
- Fit an existing group: ${by((r) => r.answer.groups.length)}; proposed a new group: ${by((r) => r.answer.newGroup)} (${Object.keys(newGroups).length} distinct names).
`;
appendFileSync(join(OUT, 'summary.md'), text);
console.log(text);
