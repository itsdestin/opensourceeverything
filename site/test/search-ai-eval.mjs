// Scores the meaning-search blend (assets/search-ai.js) on every query set, against the word ranker alone.
// Run: EMBED_PYTHON=<python with fastembed> node site/test/search-ai-eval.mjs
// It embeds each typed query with the SAME model the Worker uses (locally, via site/embed-local.py), ranks the
// committed item vectors (data/search-vectors.json) with the Worker's own code, then applies the browser's blend.
// WHY not part of `npm test`/CI: it needs python + a ~130 MB model download. search-queries-blind.json must never be
// tuned against: change settings using the other sets, then look at blind once.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadData } from '../src/lib.mjs';
import { searchIndex } from '../src/search-index.mjs';
import { idOf } from '../src/embed-text.mjs';
import { localEmbed } from '../embed-items.mjs';
import { decodeVectors, rank } from '../../worker/src/search.js';

const HERE = dirname(fileURLToPath(import.meta.url)); const ROOT = join(HERE, '..', '..');
const ctx = { globalThis: {} };
for (const f of ['search-core.js', 'search-ai.js']) vm.runInNewContext(readFileSync(join(HERE, '..', 'assets', f), 'utf8'), ctx);
const { prepare, search } = ctx.globalThis.OISearch; const AI = ctx.globalThis.OISearchAI;
const items = prepare(searchIndex(loadData(ROOT)));
const V = decodeVectors(JSON.parse(readFileSync(join(ROOT, 'data', 'search-vectors.json'), 'utf8')));
const SETS = ['search-queries', 'search-queries-heldout', 'search-queries-described', 'search-queries-final', 'search-queries-blind'];
const sets = Object.fromEntries(SETS.map((s) => [s, JSON.parse(readFileSync(join(HERE, `${s}.json`), 'utf8')).queries]));
const all = [...new Set(Object.values(sets).flat().map((x) => x.q))];
const qv = new Map(all.map((q, i) => [q, null]));
const vecs = localEmbed(all); all.forEach((q, i) => qv.set(q, vecs[i]));

const flat = (secs) => secs.flatMap((s) => s.items.map((x) => idOf(x.u)));
function run(x, ai) {
  const wordAll = search(items, x.q, { all: true });
  if (!ai || !AI.isWeak(x.q, wordAll)) return { got: flat(search(items, x.q)), asked: false };
  return { got: flat(AI.sections(AI.blend(items, x.q, wordAll, rank(V, qv.get(x.q))))), asked: true };
}
const pct = (n, d) => `${Math.round(100 * n / d)}%`.padStart(4);
console.log('set'.padEnd(26), 'word-only: first found rr', '   blended: first found rr   asked');
for (const s of SETS) {
  const line = [false, true].map((ai) => {
    const rows = sets[s].map((x) => { const r = run(x, ai); const k = r.got.findIndex((id) => x.want.includes(id)); return { k, asked: r.asked }; });
    const n = rows.length;
    return `${pct(rows.filter((r) => r.k === 0).length, n)} ${pct(rows.filter((r) => r.k >= 0).length, n)} ${(rows.reduce((a, r) => a + (r.k >= 0 ? 1 / (r.k + 1) : 0), 0) / n).toFixed(2)}${ai ? '      ' + pct(rows.filter((r) => r.asked).length, n) : ''}`;
  });
  console.log(s.padEnd(26), line[0].padEnd(24), line[1]);
}
