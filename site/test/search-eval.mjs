// Scores the search box against real searches (search-queries.json) and compares it with the old search.
// Run: node site/test/search-eval.mjs            → summary per kind of search, plus every miss
//      node site/test/search-eval.mjs --all      → every query, with what came first
//      node site/test/search-eval.mjs --q "video editor"  → the full dropdown for one search
// Exits 1 if the new search falls below the bar in MIN, so CI catches a ranking that got worse.
//
// What the numbers mean:
// - "first right": the first thing in the dropdown is one of the right answers (what Enter opens).
// - "found": a right answer is somewhere in the dropdown.
// - "rank score": 1 when a right answer is first, 1/2 when second, 1/3 third…, 0 when absent (averaged).
// - "musts": the extra results a search should also show (e.g. GIMP when searching Photoshop).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadData } from '../src/lib.mjs';
import { searchIndex } from '../src/search-index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
// WHY run the browser file itself: the tests must measure exactly what visitors get.
const ctx = { globalThis: {} };
vm.runInNewContext(readFileSync(join(HERE, '..', 'assets', 'search-core.js'), 'utf8'), ctx);
const { prepare, search } = ctx.globalThis.OISearch;

const raw = searchIndex(loadData(ROOT));
const items = prepare(raw);
// WHY two sets: search-queries.json is what the ranking was tuned on; search-queries-heldout.json was written
// separately, without seeing the ranking code, to catch tuning that only works on the first set.
// search-queries-described.json: 100 needs described in plain words, also written without seeing the code.
const SET = process.argv.includes('--heldout') ? 'search-queries-heldout.json'
  : process.argv.includes('--described') ? 'search-queries-described.json'
  : process.argv.includes('--final') ? 'search-queries-final.json' : 'search-queries.json';
const { queries } = JSON.parse(readFileSync(join(HERE, SET), 'utf8'));

// The dropdown as one list, top to bottom, as ids like "c:notion".
const idOf = (u) => u.replace(/^alternatives-to\/(.*)\/$/, 'c:$1').replace(/^g\/(.*)\/$/, 'g:$1').replace(/^p\/(.*)\/$/, 'p:$1');
const newSearch = (q) => search(items, q).flatMap((sec) => sec.items.map((x) => idOf(x.u)));

// The search as it was before (site.js until Oct 26): name contains the typed text, names starting with it
// first, always in the order closed apps, groups, projects.
function oldSearch(t) {
  const q = t.trim().toLowerCase(); if (!q) return [];
  const pick = (list, n) => list.filter((x) => x.n.toLowerCase().includes(q))
    .sort((a, b) => (a.n.toLowerCase().startsWith(q) ? 0 : 1) - (b.n.toLowerCase().startsWith(q) ? 0 : 1)).slice(0, n);
  return [...pick(raw.closed, 6), ...pick(raw.groups, 4), ...pick(raw.projects, 6)].map((x) => idOf(x.u));
}

// Check that every expected id exists, so a typo in the test file isn't counted as a search failure.
const known = new Set([...raw.closed, ...raw.groups, ...raw.projects].map((x) => idOf(x.u)));
const bad = queries.flatMap((x) => [...x.want, ...(x.include || [])]).filter((id) => !known.has(id));
if (bad.length) { console.error(`Unknown ids in search-queries.json: ${[...new Set(bad)].join(', ')}`); process.exit(2); }

function grade(run) {
  return queries.map((x) => {
    const got = run(x.q);
    const rank = got.findIndex((id) => x.want.includes(id));
    const musts = (x.include || []).filter((id) => got.includes(id)).length;
    return { ...x, got, first: rank === 0, found: rank >= 0, rr: rank >= 0 ? 1 / (rank + 1) : 0, musts, mustsOf: (x.include || []).length };
  });
}
const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : '-');
function summary(rows) {
  const n = rows.length;
  return {
    first: rows.filter((r) => r.first).length / n,
    found: rows.filter((r) => r.found).length / n,
    rr: rows.reduce((s, r) => s + r.rr, 0) / n,
    // A set with no "musts" listed passes that check rather than scoring zero.
    musts: rows.reduce((s, r) => s + r.mustsOf, 0) ? rows.reduce((s, r) => s + r.musts, 0) / rows.reduce((s, r) => s + r.mustsOf, 0) : 1,
  };
}

const args = process.argv.slice(2);
if (args[0] === '--q') {
  for (const sec of search(items, args[1])) {
    console.log(`── ${sec.kind}`);
    for (const x of sec.items) console.log(`   ${x.score.toFixed(2)}  ${x.n}  (${x.label})`);
  }
  process.exit(0);
}

const oldRows = grade(oldSearch), newRows = grade(newSearch);
const kinds = [...new Set(queries.map((x) => x.kind))];
const line = (label, rows) => {
  const s = summary(rows);
  return `${label.padEnd(14)} ${String(rows.length).padStart(4)}   first right ${pct(s.first * rows.length, rows.length).padStart(4)}   found ${pct(s.found * rows.length, rows.length).padStart(4)}   rank score ${s.rr.toFixed(2)}   musts ${pct(s.musts, 1).padStart(4)}`;
};
console.log(`${SET}: ${queries.length} searches, ${items.length} things to find\n`);
console.log('OLD search');
for (const k of kinds) console.log('  ' + line(k, oldRows.filter((r) => r.kind === k)));
console.log('  ' + line('ALL', oldRows));
console.log('\nNEW search');
for (const k of kinds) console.log('  ' + line(k, newRows.filter((r) => r.kind === k)));
console.log('  ' + line('ALL', newRows));

const misses = newRows.filter((r) => !r.first || r.musts < r.mustsOf);
console.log(`\nNew search misses (${misses.length}):`);
for (const r of misses) {
  const lost = (r.include || []).filter((id) => !r.got.includes(id));
  console.log(`  "${r.q}"  wanted ${r.want.join(' / ')}  got ${r.got.slice(0, 3).join(', ') || 'nothing'}${lost.length ? `  missing ${lost.join(', ')}` : ''}`);
}
const worse = newRows.filter((r, i) => r.rr < oldRows[i].rr);
if (worse.length) console.log(`\nWorse than the old search (${worse.length}): ${worse.map((r) => `"${r.q}"`).join(', ')}`);
if (args.includes('--all')) for (const r of newRows) console.log(`${r.first ? 'ok ' : 'MISS'} "${r.q}" → ${r.got.slice(0, 4).join(', ')}`);

// Edge cases that must never break.
for (const q of ['', ' ', 'a', 'x', '?!', 'zzzzqqqq', 'a'.repeat(200), '"; DROP TABLE', 'ü', '日本']) search(items, q);
const nonsense = newSearch('zzzzqqqq');
if (nonsense.length) { console.error('\nFAIL: nonsense query "zzzzqqqq" returned results'); process.exit(1); }

// WHY a bar: a future change that makes ranking worse should fail loudly, not ship quietly.
// Plain-words needs are harder by nature, so their bar is a little lower.
const MIN = SET === 'search-queries-described.json' ? { first: 0.85, found: 0.95, musts: 0.9 } : { first: 0.9, found: 0.97, musts: 0.9 };
const s = summary(newRows);
const fails = Object.entries(MIN).filter(([k, v]) => s[k] < v);
if (fails.length) { console.error(`\nFAIL: below the bar: ${fails.map(([k, v]) => `${k} ${s[k].toFixed(2)} < ${v}`).join(', ')}`); process.exit(1); }
console.log('\nPASS');
