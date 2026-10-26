// Paid, ~$0.15 (estimate; see summary line printed at the end): Claude Haiku 5.5 reads each uncertain project's
// README and fills in or corrects the devices it runs on. Only entries the free pass marked sure:false are sent.
// Reads prefill/out/platforms.json (from fetch-platforms.mjs), writes it back with the answers merged in.
// Run: node prefill/check-platforms.mjs      (add --dry to only print the token estimate, no API calls)

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const DRY = process.argv.includes('--dry');
const projects = JSON.parse(readFileSync(join(HERE, '..', 'data/projects.json'), 'utf8')).projects;
const platforms = JSON.parse(readFileSync(join(OUT, 'platforms.json'), 'utf8'));
const GH = process.env.GH_TOKEN; // optional: only raises GitHub's rate limit for README fetches
const VALUES = ['windows', 'mac', 'linux', 'android', 'ios', 'web', 'server'];
const client = DRY ? null : new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? readFileSync(join(homedir(), '.config/alternatives-map/anthropic-key'), 'utf8').trim(), maxRetries: 3 });

const SCHEMA = { type: 'object', additionalProperties: false, required: ['platforms', 'reason'],
  properties: { platforms: { type: 'array', items: { type: 'string', enum: VALUES } }, reason: { type: 'string' } } };

async function readme(p) {
  const code = (p.code ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const url = code.startsWith('github.com/') ? `https://api.github.com/repos/${code.split('/').slice(1, 3).join('/')}/readme`
    : code.startsWith('codeberg.org/') ? `https://codeberg.org/${code.slice(13)}/raw/branch/main/README.md`
    : code.startsWith('gitlab.com/') ? `https://gitlab.com/${code.slice(11)}/-/raw/HEAD/README.md` : null;
  if (!url) return '';
  try {
    const headers = { 'User-Agent': 'opensourceeverything', ...(url.includes('api.github.com') ? { Accept: 'application/vnd.github.raw+json', ...(GH ? { Authorization: `Bearer ${GH}` } : {}) } : {}) };
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
    return r.ok ? (await r.text()).slice(0, 12_000) : '';
  } catch { return ''; }
}

const prompt = (p, entry, md) => `Which devices can an ordinary person run the open-source software "${p.name}" on?

Summary: ${p.summary}
Kind: ${p.kind}
What an automatic scan found (may be incomplete): ${entry.evidence.join('; ') || 'nothing'}

Its README (start):
${md || '(not available)'}

Answer with the list of platforms it supports: "windows", "mac", "linux" (an installable app or program), "android", "ios" (iPhone/iPad), "web" (usable in a browser at a public website with no install, e.g. a hosted app or public instances), "server" (you must run it on your own server). Include a platform only if the README, summary or kind supports it; a command-line or library project that builds on every system counts as windows, mac and linux only if it says so. If you cannot tell, return an empty list. "reason" is one short line.`;

async function ask(p) {
  const entry = platforms[p.id];
  const text = prompt(p, entry, await readme(p));
  if (DRY) return { text, usage: { input_tokens: Math.ceil(text.length / 4), output_tokens: 60 } };
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-5-5', max_tokens: 1000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: text }],
    });
    const t = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    return { answer: res.stop_reason === 'end_turn' ? JSON.parse(t) : null, usage: res.usage };
  } catch (e) { return { error: String(e).slice(0, 120), usage: {} }; }
}

const jobs = projects.filter((p) => platforms[p.id] && !platforms[p.id].sure);
const results = []; const queue = [...jobs]; let n = 0; const started = Date.now();
await Promise.all(Array.from({ length: 16 }, async () => {
  for (let p = queue.shift(); p; p = queue.shift()) {
    results.push({ id: p.id, ...(await ask(p)) });
    if (++n % 50 === 0) console.log(`${n}/${jobs.length}`);
  }
}));

const cost = results.reduce((s, r) => s + ((r.usage?.input_tokens ?? 0) * 0.10 + (r.usage?.output_tokens ?? 0) * 0.50) / 1e6, 0);
if (DRY) { console.log(`dry run: ${jobs.length} projects, ~${results.reduce((s, r) => s + r.usage.input_tokens, 0)} input tokens, ~$${cost.toFixed(2)}`); process.exit(0); }

// WHY only overwrite when it adds information: an empty answer (can't tell) must never erase what the free pass found,
// and the free pass's evidence stays so the page's data can still be traced.
let changed = 0;
for (const r of results) {
  const a = r.answer; if (!a || !a.platforms.length) continue;
  const old = platforms[r.id];
  const merged = VALUES.filter((v) => old.platforms.includes(v) || a.platforms.includes(v));
  if (merged.join() === old.platforms.join()) continue;
  platforms[r.id] = { platforms: merged, evidence: [...old.evidence, `AI (Haiku): ${a.reason}`], sure: true };
  changed++;
}
writeFileSync(join(OUT, 'platforms.json'), JSON.stringify(platforms, null, 1));
const msg = `\n## Platforms (${new Date().toISOString().slice(0, 10)}, claude-haiku-5-5)\n\n- Re-checked **${jobs.length}** uncertain projects in ${Math.round((Date.now() - started) / 1000)} seconds for **$${cost.toFixed(2)}** (${results.filter((r) => r.error).length} failed).\n- **${changed}** entries gained platforms.\n`;
appendFileSync(join(OUT, 'summary.md'), msg);
console.log(msg);
process.exit(0);
