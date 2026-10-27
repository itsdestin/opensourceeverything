// Meaning search: GET /search?q=<what someone typed>  →  { hits: [{ id, sim }] }, the things on the site closest in
// MEANING to the typed words ("keep my kids' photos without Google" → Immich, Ente Photos...).
// How it works: every item on the site has a precomputed "meaning vector" (data/search-vectors.json, written at build
// time by site/embed-items.mjs with the SAME model used here). This file turns the typed words into a vector with
// Cloudflare Workers AI and ranks the items by how close their vectors are. The browser (assets/search-ai.js) blends
// the answer with its own word-matching, and only asks when its own best match is weak.
// WHY here and not in the browser: the model is too big to ship to a phone; the Worker has it for free.
// WHY nothing is stored: the typed text is used for this one request and cached by its text alone, no address, no log.

export const MODEL = '@cf/baai/bge-small-en-v1.5';
const TOP = 30;            // how many closest items we send back
const MIN_SIM = 0.5;       // below this an item is unrelated; not worth sending
const PER_MINUTE = 30;     // searches per network address per minute (cache hits are free and don't count)
const AI_TIMEOUT_MS = 4000;

// ── The item vectors, fetched from the site itself so the two can never get out of step ──
let vecCache = { at: 0, data: null };
export function decodeVectors(file) {
  const bin = atob(file.q); const n = file.ids.length, dims = file.dims;
  const out = new Float32Array(n * dims);
  for (let i = 0; i < n; i++) {
    let norm = 0;
    for (let j = 0; j < dims; j++) { const v = (bin.charCodeAt(i * dims + j) << 24 >> 24) / file.scale; out[i * dims + j] = v; norm += v * v; }
    norm = Math.sqrt(norm) || 1;
    // WHY renormalise: rounding to whole numbers shifts the length a hair; unit length makes the dot product a true cosine.
    for (let j = 0; j < dims; j++) out[i * dims + j] /= norm;
  }
  return { ids: file.ids, dims, vecs: out };
}
async function vectors(env) {
  if (!vecCache.data || Date.now() - vecCache.at > 3600e3) {
    const r = await fetch(`${env.SITE_ORIGIN}/data/search-vectors.json`, { cf: { cacheTtl: 3600 } });
    if (r.ok) vecCache = { at: Date.now(), data: decodeVectors(await r.json()) };
    else if (!vecCache.data) return null;
  }
  return vecCache.data;
}

export function rank(V, qv) {
  const norm = Math.sqrt(qv.reduce((s, x) => s + x * x, 0)) || 1;
  const hits = [];
  for (let i = 0; i < V.ids.length; i++) {
    let dot = 0;
    for (let j = 0; j < V.dims; j++) dot += V.vecs[i * V.dims + j] * qv[j];
    const sim = dot / norm;
    if (sim >= MIN_SIM) hits.push({ id: V.ids[i], sim: Math.round(sim * 1000) / 1000 });
  }
  return hits.sort((a, b) => b.sim - a.sim || a.id.localeCompare(b.id)).slice(0, TOP);
}

const memo = new Map(); // text → { at, hits }, so a popular search costs one AI call per hour per server instance
const reply = (data, status, cors, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors, ...extra } });

export async function handleSearch(req, env, url, cors = {}) {
  // WHY lower-cased and trimmed: "Photos " and "photos" are one search, and share one cached answer.
  const q = (url.searchParams.get('q') ?? '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 200);
  if (q.length < 3) return reply({ error: 'Type a few more letters.' }, 400, cors, { 'Cache-Control': 'no-store' });
  const ok = (hits) => reply({ q, hits }, 200, cors, { 'Cache-Control': 'public, max-age=3600' });

  const seen = memo.get(q);
  if (seen && Date.now() - seen.at < 3600e3) return ok(seen.hits);
  const cacheKey = new Request(`https://search-cache.invalid/search?q=${encodeURIComponent(q)}`);
  const edge = typeof caches !== 'undefined' ? caches.default : null;
  const cached = edge && await edge.match(cacheKey).catch(() => null);
  if (cached) { const d = await cached.json(); memo.set(q, { at: Date.now(), hits: d.hits }); return ok(d.hits); }

  // Slow down anyone asking a lot (the AI call is the one thing here that costs anything). Same table as voting.
  // WHY no address limit in local testing: every test request shares one address there.
  if (env.DB && env.DEV_LOGIN !== '1') {
    const bucket = Math.floor(Date.now() / 60e3); const key = `ip:${req.headers.get('CF-Connecting-IP') ?? 'unknown'}:search`;
    const r = await env.DB.prepare('INSERT INTO rate_limits (key, bucket, n) VALUES (?, ?, 1) ON CONFLICT(key, bucket) DO UPDATE SET n = n + 1 RETURNING n').bind(key, bucket).first();
    if (r.n > PER_MINUTE) return reply({ error: 'Slow down a little, then try again.' }, 429, cors, { 'Cache-Control': 'no-store' });
  }

  const V = await vectors(env);
  if (!V || !env.AI) return reply({ error: 'Meaning search is not available right now.' }, 503, cors, { 'Cache-Control': 'no-store' });
  let qv, timer;
  try {
    // pooling "cls": the way this model was trained, and how the item vectors were made (default would be "mean").
    const out = await Promise.race([env.AI.run(MODEL, { text: [q], pooling: 'cls' }), new Promise((_, no) => { timer = setTimeout(() => no(new Error('timeout')), AI_TIMEOUT_MS); })]);
    qv = out?.data?.[0];
  } catch { return reply({ error: 'Meaning search is not available right now.' }, 503, cors, { 'Cache-Control': 'no-store' }); } finally { clearTimeout(timer); }
  if (!Array.isArray(qv) || qv.length !== V.dims) return reply({ error: 'Meaning search is not available right now.' }, 503, cors, { 'Cache-Control': 'no-store' });

  const hits = rank(V, qv);
  memo.set(q, { at: Date.now(), hits }); if (memo.size > 500) memo.delete(memo.keys().next().value);
  if (edge) await edge.put(cacheKey, new Response(JSON.stringify({ hits }), { headers: { 'Cache-Control': 'public, max-age=3600' } })).catch(() => {});
  return ok(hits);
}
