// Paid, ~$0.30: Claude Haiku 5.5 looks at each candidate picture and keeps only real screenshots of the
// project's interface (READMEs and websites also hold mascots, logos, banners and "star this repo" animations).
// Reads prefill/out/screenshot-candidates.json, writes prefill/out/screenshots.json (up to 4 per project, best first).
// Run: node prefill/check-screenshots.mjs

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const apiKey = process.env.ANTHROPIC_API_KEY ?? readFileSync(join(homedir(), '.config/alternatives-map/anthropic-key'), 'utf8').trim();
const client = new Anthropic({ apiKey, maxRetries: 3 });
// --only "id1,id2": judge just these projects' pictures and merge them into the existing screenshots.json.
const oi = process.argv.indexOf('--only'); const ONLY = oi > 0 ? new Set(process.argv[oi + 1].split(',')) : null;
const candidates = Object.fromEntries(Object.entries(JSON.parse(readFileSync(join(OUT, 'screenshot-candidates.json'), 'utf8'))).filter(([id]) => !ONLY || ONLY.has(id)));
const names = new Map(JSON.parse(readFileSync(join(HERE, '..', 'data/projects.json'), 'utf8')).projects.map((p) => [p.id, p.name]));

const SCHEMA = { type: 'object', additionalProperties: false, required: ['isInterface', 'quality'],
  properties: { isInterface: { type: 'boolean' }, quality: { type: 'string', enum: ['good', 'ok', 'poor'] } } };

async function judge(id, url) {
  try {
    const res = await client.messages.create({
      model: 'claude-haiku-5-5', max_tokens: 1000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'url', url } },
        { type: 'text', text: `Is this picture a screenshot of the software "${names.get(id) ?? id}" being used — its windows, screens or pages — rather than a logo, mascot, banner, diagram, chart, photo or advert? quality: "good" if it clearly shows what using it looks like, "ok" if small or cluttered, "poor" if hard to make out.` },
      ] }],
    });
    const t = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    return { url, ...(res.stop_reason === 'end_turn' ? JSON.parse(t) : { isInterface: false, quality: 'poor' }), usage: res.usage };
  } catch (e) {
    // A picture that can't be fetched or read isn't shown either.
    return { url, isInterface: false, quality: 'poor', error: String(e).slice(0, 120) };
  }
}

const jobs = Object.entries(candidates).flatMap(([id, urls]) => urls.map((u) => [id, u]));
const verdicts = []; const queue = [...jobs]; let n = 0; const started = Date.now();
await Promise.all(Array.from({ length: 16 }, async () => {
  for (let j = queue.shift(); j; j = queue.shift()) {
    verdicts.push({ id: j[0], ...(await judge(j[0], j[1])) });
    if (++n % 200 === 0) console.log(`${n}/${jobs.length}`);
  }
}));
const rank = { good: 0, ok: 1, poor: 2 };
const out = {};
for (const [id, urls] of Object.entries(candidates)) {
  out[id] = verdicts.filter((v) => v.id === id && v.isInterface && v.quality !== 'poor')
    .sort((a, b) => rank[a.quality] - rank[b.quality] || urls.indexOf(a.url) - urls.indexOf(b.url)).slice(0, 4).map((v) => v.url);
}
writeFileSync(join(OUT, 'screenshots.json'), JSON.stringify(ONLY ? { ...JSON.parse(readFileSync(join(OUT, 'screenshots.json'), 'utf8')), ...out } : out, null, 1));
const cost = verdicts.reduce((s, v) => s + ((v.usage?.input_tokens ?? 0) * 0.10 + (v.usage?.output_tokens ?? 0) * 0.50) / 1e6, 0);
const have = Object.values(out).filter((x) => x.length).length;
const msg = `\n## Screenshots (${new Date().toISOString().slice(0, 10)}, claude-haiku-5-5)\n\n- Looked at **${jobs.length}** candidate pictures in ${Math.round((Date.now() - started) / 1000)} seconds for **$${cost.toFixed(2)}** (${verdicts.filter((v) => v.error).length} couldn't be loaded).\n- **${have}** of ${Object.keys(out).length} projects have at least one real screenshot (${Object.values(out).reduce((s, x) => s + x.length, 0)} kept).\n`;
appendFileSync(join(OUT, 'summary.md'), msg);
console.log(msg);
