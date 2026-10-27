// Tests for GET /search (src/search.js) with a FAKE Workers AI and a FAKE database: no network, no wrangler.
// Run: node --test test/search.test.mjs   (the other test file needs a running local server; this one doesn't.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decodeVectors } from '../src/search.js';
import worker from '../src/index.js';

const file = JSON.parse(readFileSync(fileURLToPath(new URL('../../data/search-vectors.json', import.meta.url)), 'utf8'));
const V = decodeVectors(file);
const vecOf = (id) => Array.from(V.vecs.slice(V.ids.indexOf(id) * V.dims, (V.ids.indexOf(id) + 1) * V.dims));

// The site serves the vectors file; the Worker fetches it. Replace fetch so no real request is made.
let fetches = 0;
globalThis.fetch = async (u) => { fetches++; assert.match(String(u), /\/data\/search-vectors\.json$/); return new Response(JSON.stringify(file)); };

const fakeAI = (answer) => { const ai = { calls: 0, async run(model, input) { ai.calls++; ai.last = { model, input }; return answer(input); } }; return ai; };
const fakeDB = (n = 1) => ({ prepare: () => ({ bind: () => ({ first: async () => ({ n }) }) }) });
const env = (ai, db = fakeDB()) => ({ SITE_ORIGIN: 'https://site.test', AI: ai, DB: db });
const get = (e, q, ip = '1.1.1.1') => worker.fetch(new Request(`https://api.test/search?q=${encodeURIComponent(q)}`, { headers: { 'CF-Connecting-IP': ip } }), e);

test('returns the closest things first, with the right model and settings', async () => {
  const ai = fakeAI(() => ({ data: [vecOf('p:immich')] }));
  const r = await get(env(ai), 'keep my kids photos without google');
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.hits[0].id, 'p:immich'); assert.ok(j.hits[0].sim > 0.99);
  assert.ok(j.hits.length <= 30);
  assert.equal(ai.last.model, '@cf/baai/bge-small-en-v1.5'); assert.equal(ai.last.input.pooling, 'cls'); assert.deepEqual(ai.last.input.text, ['keep my kids photos without google']);
  assert.equal(r.headers.get('Access-Control-Allow-Origin'), 'https://site.test', 'same read-access rule as the other calls');
});

test('the same search twice asks the AI once (cached), whatever the capitals and spacing', async () => {
  const ai = fakeAI(() => ({ data: [vecOf('p:bitwarden')] }));
  const e = env(ai);
  await get(e, 'somewhere safe for my passwords'); await get(e, '  Somewhere   safe for my PASSWORDS ');
  assert.equal(ai.calls, 1);
});

test('too-short searches are refused without calling the AI', async () => {
  const ai = fakeAI(() => ({ data: [vecOf('p:immich')] }));
  assert.equal((await get(env(ai), 'ab')).status, 400); assert.equal(ai.calls, 0);
});

test('if the AI fails or answers nonsense, the site gets a calm 503 (and falls back to word search)', async () => {
  assert.equal((await get(env(fakeAI(() => { throw new Error('boom'); })), 'broken ai one')).status, 503);
  assert.equal((await get(env(fakeAI(() => ({ data: [[1, 2, 3]] }))), 'broken ai two')).status, 503);
  assert.equal((await get({ SITE_ORIGIN: 'https://site.test', DB: fakeDB() }, 'no binding at all')).status, 503);
});

test('someone asking too often is slowed down; cached answers never count', async () => {
  const ai = fakeAI(() => ({ data: [vecOf('p:immich')] }));
  const r = await get(env(ai, fakeDB(31)), 'rate limited question');
  assert.equal(r.status, 429); assert.equal(ai.calls, 0);
  await get(env(ai, fakeDB(1)), 'rate limit then cached question');
  assert.equal((await get(env(ai, fakeDB(99)), 'rate limit then cached question')).status, 200);
});

test('the search text is not stored anywhere: only a count per network address touches the database', async () => {
  const seen = [];
  const db = { prepare: (sql) => ({ bind: (...a) => { seen.push([sql, ...a]); return { first: async () => ({ n: 1 }) }; } }) };
  await get(env(fakeAI(() => ({ data: [vecOf('p:immich')] })), db), 'a private thing i typed');
  assert.ok(seen.length === 1 && /rate_limits/.test(seen[0][0])); assert.ok(!JSON.stringify(seen).includes('private thing'));
});
