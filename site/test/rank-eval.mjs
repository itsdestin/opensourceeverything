// Checks in-group ordering (site/src/rank.mjs): invariants that must always hold, and how well the order agrees with the
// editors' best-first order in data/groups.json, compared with the order the site used before (fit, then stars).
// Run: node site/test/rank-eval.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadData } from '../src/lib.mjs';
import { sortAlts } from '../src/cards.mjs';
import { rankAlts, wilsonLower, communityPoints, WEIGHTS } from '../src/rank.mjs';
const d = loadData(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
let fail = 0; const must = (ok, msg) => { if (!ok) { fail++; console.error('FAIL: ' + msg); } };

// Invariants. The "cautious score" from the plan: 2 of 2 never outranks 90 of 100; no votes is neutral.
must(communityPoints(2, 0) < communityPoints(90, 10), '2 of 2 must score below 90 of 100');
must(communityPoints(0, 0) === 0, 'no votes = 0 points');
must(wilsonLower(5, 5) < wilsonLower(45, 50), '5 of 5 below 45 of 50');
must(Math.abs(communityPoints(1, 0)) < 5, 'one thumb moves little');
must(communityPoints(0, 12) < 0 && communityPoints(0, 12) >= -WEIGHTS.communityMax, 'bad votes cost points, bounded');
// A crowd can't lift a partial fit over a full one by itself.
const mk = (id, fit, extra = {}) => ({ a: { fit }, p: { id, stars: 1000, platforms: ['linux'], ...extra }, idx: 0 });
const r1 = rankAlts([mk('x', 'partial'), mk('y', 'full')], { ratings: new Map([['x', { up: 500, down: 0 }], ['y', { up: 3, down: 2 }]]) });
must(r1[0].p.id === 'y', 'partial with a huge crowd must not beat a full replacement');

// Agreement with the editors' order (their first pick is #1 / in our top 3), over groups with 3+ options.
const rows = [];
for (const g of d.groups) {
  const es = g.alternatives.map((a, idx) => ({ a, p: d.projById.get(a.project), idx })).filter((e) => e.p);
  if (es.length < 3) continue;
  // WHY the old rule written out: sortAlts IS the new ranking now, so "old" is the pre-score site rule (fit, then stars).
  const old = es.map((e) => ({ ...e })).sort((x, y) => (y.a.fit === 'full') - (x.a.fit === 'full') || (y.p.stars ?? 0) - (x.p.stars ?? 0) || x.idx - y.idx), now = rankAlts(es);
  rows.push({ g: g.id, o1: old[0].idx === 0, n1: now[0].idx === 0, o3: old.slice(0, 3).some((e) => e.idx === 0), n3: now.slice(0, 3).some((e) => e.idx === 0),
    // the editors' top 3 as a set vs ours
    ov: old.slice(0, 3).filter((e) => e.idx < 3).length, nv: now.slice(0, 3).filter((e) => e.idx < 3).length });
}
const pct = (k) => `${Math.round((100 * rows.filter((r) => r[k]).length) / rows.length)}%`;
const avg = (k) => (rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(2);
console.log(`${rows.length} groups with 3+ options. Editors' first pick shown first: old ${pct('o1')}  new ${pct('n1')}.  In top 3: old ${pct('o3')}  new ${pct('n3')}.`);
console.log(`Overlap of top 3 with editors' top 3 (of 3): old ${avg('ov')}  new ${avg('nv')}`);
// Show a few groups so a human can eyeball them.
for (const id of ['documents', 'photo-editing', 'password-managers', 'tasks']) {
  const g = d.groups.find((x) => x.id === id); if (!g) continue;
  const es = g.alternatives.map((a, idx) => ({ a, p: d.projById.get(a.project), idx })).filter((e) => e.p);
  console.log(`${id}: ${rankAlts(es).slice(0, 4).map((e) => `${e.p.name} (${e.score.toFixed(0)})`).join(', ')}`);
}
process.exit(fail ? 1 : 0);
