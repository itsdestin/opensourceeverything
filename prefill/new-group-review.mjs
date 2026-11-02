// Step 2 of filling the 194 new groups (paid, about $1 with Claude Haiku 5.5): one request per candidate that passed step 1
// (prefill/new-group-facts.mjs). It reads the project's README (and its license file when the code site couldn't name one) and
// returns: a plain two-sentence summary, its kind, a license verdict, and, for EACH new group it was proposed for, whether it
// really does that job. Writes prefill/out/new-group-review.json. Run: GH_TOKEN=$(gh auth token) node prefill/new-group-review.mjs [--count]
//
// WHY one request per project covering all its groups (Destin: "categories overlap, so let a project appear in several groups"):
// the model judges every proposed group at once, so a project lands in each group it truly fits and nowhere it doesn't.
// WHY the key comes from a file: never typed into chat or saved in the repo (same as ai-review.mjs).

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseCode } from './hosts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const CACHE = join(HERE, '.cache', 'readmes'); mkdirSync(CACHE, { recursive: true });
const COUNT_ONLY = process.argv.includes('--count');
const GH = process.env.GH_TOKEN;
if (!GH) { console.error('Set GH_TOKEN (e.g. GH_TOKEN=$(gh auth token)).'); process.exit(1); }
const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const taxonomy = read(join(HERE, 'taxonomy.json'));
const gById = new Map(taxonomy.newGroups.map((g) => [g.id, g]));
// WHY skip the 20 thinnest groups (Destin picked "hide the 20 thinnest until a project lands in them"): they wait for a
// project to be tagged in by a person, so their research candidates are not filled in now.
const facts = read(join(OUT, 'new-group-facts.json')).map((e) => ({ ...e, groups: e.groups.filter((id) => !gById.get(id)?.waitForProject) }));
// WHY these verdicts: "open" needs only a summary and the group check; "unclear"/"missing" also need the license file read.
// Projects already on the map are judged too, so they can join the new groups they fit.
const todo = facts.filter((e) => e.groups.length && ['open', 'unclear', 'missing', 'on-map'].includes(e.verdict));

const MODEL = 'claude-haiku-5-5';
const SYSTEM = `You help build a public map of open-source software, for the r/TrueOpenSource community. Visitors are everyday people, not developers.
You get one project: its README, sometimes its license file, and the groups (jobs) a researcher proposed for it.
Answer only from the material given. If something isn't stated there, say so in "unconfirmed" rather than guessing.

Rules:
- summary: two short, neutral, plain-language sentences a non-technical person understands: what it is, then who it's for. No marketing words ("blazing", "powerful", "best", "seamless"). No jargon without a plain explanation.
- kind: "app" (people install or open it directly: a computer, phone or browser app, a game, a browser extension), "self_hosted" (you run it on your own server and people use it in a browser), "developer_tool" (for programmers or IT people, including command-line tools), "library" (code other programs use).
- license.verdict: when "License reported by its code site" is an OSI-approved license and nothing given contradicts it, answer "open". Otherwise read the license file or README: "open" (an OSI-approved license for the whole project), "open_core" (open, with paid or differently licensed parts), "not_open" (source-available, non-commercial, no license, or restrictive), "unclear". license.spdx: the SPDX id when known (e.g. "GPL-3.0-or-later"), else null.
- groups: one entry per proposed group. fit "full" = does the group's main job; "partial" = covers some of it (say what's missing in note, under 70 characters, plain words); "no" = it doesn't do this job. note is null for "full".`;
const SCHEMA = {
  type: 'object', additionalProperties: false, required: ['summary', 'kind', 'license', 'groups', 'unconfirmed'],
  properties: {
    summary: { type: 'string' },
    kind: { type: 'string', enum: ['app', 'self_hosted', 'developer_tool', 'library'] },
    license: { type: 'object', additionalProperties: false, required: ['verdict', 'spdx', 'note'],
      properties: { verdict: { type: 'string', enum: ['open', 'open_core', 'not_open', 'unclear'] }, spdx: { anyOf: [{ type: 'string' }, { type: 'null' }] }, note: { type: 'string' } } },
    groups: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['group', 'fit', 'note'],
      properties: { group: { type: 'string' }, fit: { type: 'string', enum: ['full', 'partial', 'no'] }, note: { anyOf: [{ type: 'string' }, { type: 'null' }] } } } },
    unconfirmed: { type: 'array', items: { type: 'string' } },
  },
};

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
async function getText(url, headers = {}) { try { const r = await fetch(url, { headers: { 'User-Agent': 'opensourceeverything', ...headers }, signal: AbortSignal.timeout(15_000) }); return r.ok ? r.text() : ''; } catch { return ''; } }
const gh = (path) => getText(`https://api.github.com/repos/${path}`, { Authorization: `Bearer ${GH}`, Accept: 'application/vnd.github.raw+json' });
async function material(e) {
  const file = join(CACHE, `new-${norm(e.name)}.json`);
  if (existsSync(file)) return read(file);
  const pc = parseCode(e.code); let readme = '', license = '';
  const needLicense = e.verdict === 'unclear' || e.verdict === 'missing';
  if (pc?.host === 'github.com') {
    readme = await gh(`${pc.path}/readme`);
    if (needLicense) license = (await gh(`${pc.path}/license`)) || (await getText(`https://raw.githubusercontent.com/${pc.path}/HEAD/COPYING`)) || (await getText(`https://raw.githubusercontent.com/${pc.path}/HEAD/LICENSE.md`));
  } else if (pc) {
    // GitLab and Forgejo sites both serve raw files at these paths; try the usual names.
    const raw = (f) => (pc.host.includes('gitlab') || pc.host.includes('kde') || pc.host.includes('gnome') || pc.host.includes('videolan') || pc.host.includes('freedesktop') ? `https://${pc.host}/${pc.path}/-/raw/HEAD/${f}` : `https://${pc.host}/${pc.path}/raw/branch/main/${f}`);
    for (const f of ['README.md', 'README', 'README.rst', 'README.txt']) { readme = await getText(raw(f)); if (readme) break; }
    if (needLicense) for (const f of ['LICENSE', 'COPYING', 'LICENSE.md', 'LICENSE.txt']) { license = await getText(raw(f)); if (license) break; }
  }
  // WHY trim: the opening of a README says what a project is; install steps cost tokens and add nothing.
  const m = { readme: readme.replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').slice(0, 10_000), license: license.slice(0, 3_000) };
  writeFileSync(file, JSON.stringify(m));
  return m;
}
function input(e, m) {
  const groups = e.groups.map((id) => { const g = gById.get(id); return `- ${id}: ${g.name}. Job: ${g.job}.${g.closed.length ? ` Closed apps it would stand in for: ${g.closed.join(', ')}.` : ''}`; }).join('\n');
  return `Project: ${e.name}\nCode: ${e.code}\nLicense reported by its code site: ${e.facts?.license ?? (e.verdict === 'on-map' ? 'already checked' : 'not reported')}\n\nProposed groups:\n${groups}\n\n` +
    `README (start):\n${m.readme || '(no README found)'}\n` + (m.license ? `\nLicense file (start):\n${m.license}\n` : '');
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? readFileSync(join(homedir(), '.config/alternatives-map/anthropic-key'), 'utf8').trim(), maxRetries: 4 });
if (COUNT_ONLY) {
  // Free: exact input size and price before anything is sent.
  let tokens = 0; const sample = todo.slice(0, 40);
  for (const e of sample) tokens += (await client.messages.countTokens({ model: MODEL, system: SYSTEM, messages: [{ role: 'user', content: input(e, await material(e)) }] })).input_tokens;
  const perProject = tokens / sample.length;
  console.log(`${todo.length} projects; about ${Math.round(perProject)} input tokens each; estimate $${((perProject * todo.length * 0.10 + 350 * todo.length * 0.50) / 1e6).toFixed(2)}`);
  process.exit(0);
}

const results = []; const queue = [...todo]; let done = 0; const started = Date.now();
await Promise.all(Array.from({ length: 16 }, async () => {
  for (let e = queue.shift(); e; e = queue.shift()) {
    try {
      const res = await client.messages.create({ model: MODEL, max_tokens: 3000, system: SYSTEM,
        // WHY low effort: a short reading task; deeper reasoning costs more and adds little.
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        messages: [{ role: 'user', content: input(e, await material(e)) }] });
      if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') results.push({ name: e.name, error: res.stop_reason, usage: res.usage });
      else results.push({ name: e.name, answer: JSON.parse(res.content.filter((b) => b.type === 'text').map((b) => b.text).join('')), usage: res.usage });
    } catch (err) { results.push({ name: e.name, error: err instanceof Anthropic.APIError ? `${err.status} ${err.name}` : String(err) }); }
    if (++done % 50 === 0) console.log(`${done}/${todo.length}`);
  }
}));
const inTok = results.reduce((s, r) => s + (r.usage?.input_tokens ?? 0), 0);
const outTok = results.reduce((s, r) => s + (r.usage?.output_tokens ?? 0), 0);
writeFileSync(join(OUT, 'new-group-review.json'), JSON.stringify(results, null, 1));
const ok = results.filter((r) => r.answer);
const v = (x) => ok.filter((r) => r.answer.license.verdict === x).length;
console.log(`reviewed ${ok.length}/${todo.length} in ${Math.round((Date.now() - started) / 1000)}s, ${results.length - ok.length} failed; $${((inTok * 0.10 + outTok * 0.50) / 1e6).toFixed(2)}; license: ${v('open')} open, ${v('open_core')} open core, ${v('not_open')} not open, ${v('unclear')} unclear`);
