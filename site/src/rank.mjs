// How alternatives are ordered inside a group, and WHY each one is where it is. One pure function so the group page,
// the closed-app pages, the home page, the search index and the tests all agree (site/test/rank-eval.mjs).
//
// WHY a score of explainable points, not one opaque number: every point comes from a named reason, and the reasons
// are what a visitor sees ("Does the whole job · Verified · 91% of 40 say yes"). If we can't say why something is
// first in a sentence, it shouldn't be first.
//
// WHY these weights (points, 100 is roughly "everything good"):
//   fit        40 / 14   The question the visitor asked is "can this replace it?". Nothing else outweighs a partial fit.
//   community  ±30       People's thumbs are the main signal once there are enough of them (v1-plan). Capped, so a
//                        crowd can reorder neighbours but never lift a partial replacement over a full one on its own.
//   editors    0..14     The data file lists each group best-first. It is our only judgement for a group with no
//                        votes, so it counts most when votes are empty and fades as real votes arrive.
//   verified   +10       Mods vouch for it (license, maintained, does the job). A mark, not a pin: smaller than fit.
//   stars      0..6      Popularity is a weak hint, log-scaled (1,000 vs 10,000 matters; 90,000 vs 100,000 doesn't).
//   health     -24       Archived or no activity for a year: still listed, but never first when something alive fits.
//   license    -5        Open-core: part of it is paid or under another license.
export const WEIGHTS = { full: 40, partial: 14, verified: 10, openCore: -5, dead: -24, starsMax: 6, communityMax: 30, editorMax: 14 };

// Lower end of the 80% plausible range for "what share of people would say yes" (Wilson score, z = 1.28).
// WHY the lower end: 2 of 2 is "probably between 34% and 100%", 90 of 100 is "between 85% and 94%"; ranking by the
// pessimistic end means 2 of 2 never beats 90 of 100, and a single thumb can't move anything much.
export function wilsonLower(up, n, z = 1.28) {
  if (!n) return 0;
  const p = up / n, z2 = z * z;
  return (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / (1 + z2 / n);
}

// Community points from thumbs. WHY pseudo-votes (3 up out of 5): everything starts from a believable "probably fine"
// and real votes pull away from it, so one early thumb-down can't sink a project and one thumb-up can't crown it.
// Zero votes = exactly 0 points: no votes is neutral, never a penalty.
const PRIOR_UP = 3, PRIOR_N = 5;
const LB0 = wilsonLower(PRIOR_UP, PRIOR_N);
export function communityPoints(up = 0, down = 0) {
  const n = up + down;
  if (!n) return 0;
  const lb = wilsonLower(up + PRIOR_UP, n + PRIOR_N);
  return Math.max(-WEIGHTS.communityMax, Math.min(WEIGHTS.communityMax, ((lb - LB0) / (1 - LB0)) * WEIGHTS.communityMax));
}

// entries: [{ a: alternative (fit, note), p: project, idx: position in the data file }]. opts.ratings: Map(projectId →
// { up, down }) when vote counts are available; opts.device: a platform code to favour ("linux").
// Returns new array, best first, each with .score and .why [{ text, pts }].
export function rankAlts(entries, opts = {}) {
  const W = WEIGHTS, n = entries.length;
  return entries.map((e) => {
    const { a, p } = e, why = [], add = (text, pts) => { if (pts) why.push({ text, pts: Math.round(pts * 10) / 10 }); return pts; };
    const r = opts.ratings?.get(p.id) ?? { up: 0, down: 0 }, votes = r.up + r.down;
    let s = 0;
    s += add(a.fit === 'full' ? 'Does the whole job' : 'Does part of the job', a.fit === 'full' ? W.full : W.partial);
    s += add(votes ? `${Math.round((100 * r.up) / votes)}% of ${votes} say it works` : '', communityPoints(r.up, r.down));
    // Editors' order fades with votes: full strength at 0 votes, half at 10, a quarter at 30.
    s += add(e.idx != null && n > 1 ? 'Listed near the top by editors' : '', W.editorMax * (1 - e.idx / Math.max(1, n - 1)) * (10 / (10 + votes)));
    s += add(p.verified ? 'Verified by mods' : '', W.verified);
    // Unknown stars (off GitHub: GIMP, Krita…) get a middling guess, as in search-core.js, not zero.
    s += add('', W.starsMax * Math.max(0, Math.min(1, (Math.log10((p.stars ?? 3000) + 1) - 2) / 3)));
    s += add(p.archived ? 'Archived' : p.inactive ? 'No recent activity' : '', p.archived || p.inactive ? W.dead : 0);
    s += add(p.licenseClass === 'open_core' ? 'Open core (some parts paid)' : '', p.licenseClass === 'open_core' ? W.openCore : 0);
    // Device match: demote, never hide. Server-only software still shows for people who can run a server.
    if (opts.device && p.platforms?.length) s += add(p.platforms.includes(opts.device) ? 'Runs on your device' : "Doesn't run on your device", p.platforms.includes(opts.device) ? 4 : -12);
    return { ...e, score: s, why };
  }).sort((x, y) => y.score - x.score || x.idx - y.idx);
}
