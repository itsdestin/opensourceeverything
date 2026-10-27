// Writes data/search-vectors.json: one "meaning vector" per thing on the site, for the meaning search
// (worker/src/search.js compares typed words against these). Run when items or their text change:
//   node site/embed-items.mjs --local       → uses BAAI/bge-small-en-v1.5 on this computer (python + fastembed)
//   node site/embed-items.mjs --cloudflare  → uses the same model on Cloudflare Workers AI (what CI would run)
// Needs for --cloudflare: CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (a token with "Workers AI: Read" only).
//   Neither is created or stored anywhere by this repo; CI would keep them as repository secrets.
//   The page and the site build never need them: the finished file is committed, and the build only copies it.
// --check: only report whether the committed file still matches the current text of every item (exit 1 if not).
// WHY a hash per item: re-running only re-embeds items whose text changed, so a normal data update is a handful of calls.
// WHY int8: 799 items x 384 numbers is 614 KB as 16-bit numbers and 307 KB as whole numbers -128..127. Rounding to
// whole numbers moved no test result (site/test/search-ai-eval.mjs), and the Worker rebuilds exact unit length on load.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadData } from './src/lib.mjs';
import { searchIndex } from './src/search-index.mjs';
import { embedTexts } from './src/embed-text.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'data', 'search-vectors.json');
const MODEL = '@cf/baai/bge-small-en-v1.5';
const hash = (t) => createHash('sha1').update(t).digest('hex').slice(0, 10);

export function currentTexts() {
  const d = loadData(ROOT);
  return embedTexts(searchIndex(d), new Map(d.projects.map((p) => [`p:${p.id}`.slice(2), p])));
}

export function localEmbed(texts, py = process.env.EMBED_PYTHON || 'python3') {
  const r = spawnSync(py, [join(HERE, 'embed-local.py')], { input: JSON.stringify(texts), maxBuffer: 1 << 30, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('local embedding failed: ' + (r.stderr || '').slice(-400));
  return JSON.parse(r.stdout);
}

async function cloudflareEmbed(texts) {
  const { CLOUDFLARE_ACCOUNT_ID: acct, CLOUDFLARE_API_TOKEN: token } = process.env;
  if (!acct || !token) throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI: Read).');
  const out = [];
  for (let i = 0; i < texts.length; i += 50) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${MODEL}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      // pooling "cls": how the model was trained; the Worker asks for the same, so both sides agree.
      body: JSON.stringify({ text: texts.slice(i, i + 50), pooling: 'cls' }),
    });
    const j = await r.json(); if (!r.ok || !j.success) throw new Error('Workers AI said: ' + JSON.stringify(j.errors ?? j).slice(0, 300));
    out.push(...j.result.data);
  }
  return out;
}

export function pack(ids, vecs, hashes) {
  const dims = vecs[0].length;
  const max = vecs.reduce((m, v) => v.reduce((a, x) => Math.max(a, Math.abs(x)), m), 0);
  const scale = Math.floor((127 / max) * 100) / 100;
  const bytes = new Int8Array(ids.length * dims);
  vecs.forEach((v, i) => v.forEach((x, j) => { bytes[i * dims + j] = Math.max(-127, Math.min(127, Math.round(x * scale))); }));
  return { model: MODEL, pooling: 'cls', dims, scale, ids, hashes, q: Buffer.from(bytes.buffer).toString('base64') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const texts = currentTexts();
  const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  const oldHash = new Map(old ? old.ids.map((id, i) => [id, old.hashes[i]]) : []);
  const stale = texts.filter((t) => oldHash.get(t.id) !== hash(t.text));
  const removed = old ? old.ids.filter((id) => !texts.some((t) => t.id === id)) : [];
  if (process.argv.includes('--check')) {
    console.log(stale.length || removed.length ? `search-vectors.json is out of date: ${stale.length} changed or new, ${removed.length} removed (run node site/embed-items.mjs)` : 'search-vectors.json is up to date');
    process.exit(stale.length || removed.length ? 1 : 0);
  }
  const mode = process.argv.includes('--cloudflare') ? 'cloudflare' : process.argv.includes('--local') ? 'local' : null;
  if (!mode) { console.error('Pick --local or --cloudflare (or --check).'); process.exit(2); }
  // Re-embed only what changed, unless the model/backend is being switched (then everything, so all vectors agree).
  const redo = process.argv.includes('--all') || !old ? texts : stale;
  console.log(`embedding ${redo.length} of ${texts.length} items (${mode})`);
  const fresh = new Map();
  if (redo.length) { const v = mode === 'local' ? localEmbed(redo.map((t) => t.text)) : await cloudflareEmbed(redo.map((t) => t.text)); redo.forEach((t, i) => fresh.set(t.id, v[i])); }
  // Unchanged items keep their stored vector (decoded back from whole numbers).
  const keep = new Map();
  if (old) { const bin = Buffer.from(old.q, 'base64'); old.ids.forEach((id, i) => keep.set(id, Array.from({ length: old.dims }, (_, j) => (bin.readInt8(i * old.dims + j)) / old.scale))); }
  const vecs = texts.map((t) => fresh.get(t.id) ?? keep.get(t.id));
  writeFileSync(OUT, JSON.stringify(pack(texts.map((t) => t.id), vecs, texts.map((t) => hash(t.text)))));
  console.log(`wrote ${OUT}`);
}
