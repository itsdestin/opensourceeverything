// Meaning search, browser side. Kept apart from search-core.js on purpose: the word ranker there is untouched.
// What this adds: when the word ranker's best match is weak (the person described a need instead of naming
// something), ask the server (worker/src/search.js, GET /search?q=) which things are closest in MEANING, and
// nudge the word-ranker's scores with that. If the server is slow, down, or not configured, nothing changes:
// the word results simply stay as they were.
// Settings come from the offline trial (site/test/search-ai-eval.mjs): ask only below WEAK; a thing's final score
// is its word score plus K x how far its meaning-closeness is above FLOOR.
(function (root) {
  const WEAK = 1.1, K = 0.75, FLOOR = 0.55, MIN = 0.3, CUT = 0.45, LIMITS = { closed: 5, group: 4, project: 6 };
  const KIND = { c: 'closed', g: 'group', p: 'project' };
  const uOf = (id) => ({ c: `alternatives-to/${id.slice(2)}/`, g: `g/${id.slice(2)}/`, p: `p/${id.slice(2)}/` })[id[0]];

  // Is the word ranker unsure? wordAll = OISearch.search(items, text, { all: true }). Very short text is never sent.
  const isWeak = (text, wordAll) => text.trim().length >= 4 && (wordAll[0]?.score ?? 0) < WEAK;

  // Blend word results with the server's hits ([{ id, sim }]). Returns the same shape as search(..., { all: true }).
  function blend(items, text, wordAll, hits) {
    const nWords = root.OISearch.parseQuery(text).ws.length;
    const byU = new Map(items.map((it) => [it.u, it]));
    const rows = new Map(wordAll.map((r) => [r.u, { ...r }]));
    for (const h of hits) {
      const u = uOf(h.id); const it = byU.get(u); if (!it) continue;
      const bonus = K * Math.max(0, h.sim - FLOOR);
      const row = rows.get(u);
      if (row) { row.score += bonus; if (bonus > 0.02) row.why = [...row.why, { text: 'Close in meaning to your search', kind: 'meaning' }].slice(0, 3); }
      else rows.set(u, { n: it.n, u, label: it.label, kind: it.kind, score: bonus, why: [{ text: 'Close in meaning to your search', kind: 'meaning' }], pl: it.pl || [] });
    }
    // The same cuts the word ranker makes: nothing under MIN, and per kind nothing under 45% of that kind's best.
    const by = { closed: [], group: [], project: [] };
    for (const r of rows.values()) if (r.score >= MIN) by[r.kind].push(r);
    for (const k of Object.keys(by)) {
      const top = Math.max(0, ...by[k].map((x) => x.score));
      by[k] = by[k].filter((x) => x.score >= top * CUT);
    }
    return Object.values(by).flat().sort((a, b) => b.score - a.score || a.n.localeCompare(b.n))
      .map((r) => ({ ...r, ...root.OISearch.strength(r.score, nWords) }));
  }

  // The dropdown's shape: sections (best match first), each limited like the word ranker's own.
  function sections(all) {
    const by = { closed: [], group: [], project: [] };
    for (const r of all) by[r.kind].push(r);
    return Object.entries(by).map(([kind, list]) => ({ kind, items: list.slice(0, LIMITS[kind]) })).filter((s) => s.items.length)
      .sort((a, b) => b.items[0].score - a.items[0].score);
  }

  // Ask the server. Resolves to hits, or null on ANY problem (offline, slow, refused, not configured).
  const memo = new Map();
  async function fetchHits(text, apiUrl, ms = 2500) {
    const q = text.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!apiUrl || q.length < 3) return null;
    if (memo.has(q)) return memo.get(q);
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), ms);
    try {
      const r = await fetch(`${apiUrl}/search?q=${encodeURIComponent(q)}`, { signal: ctl && ctl.signal });
      if (!r.ok) return null;
      const hits = (await r.json()).hits;
      if (!Array.isArray(hits)) return null;
      memo.set(q, hits); return hits;
    } catch { return null; } finally { clearTimeout(timer); }
  }

  // WHY off unless the build says so (AI_SEARCH=1, layout.mjs): the offline trial showed only a small gain
  // (docs/ai-search.md), so turning it on is Destin's call. Also needs the real server address (no server, no meaning search).
  const serverUrl = () => (root.window && root.OI_AI_SEARCH && root.OI_API_URL) || '';

  // One call for both screens: resolves to blended results (same shape as search(..., { all: true })), or null when
  // there is nothing to improve (strong match, switched off, server down).
  async function improve(items, text, wordAll) {
    if (!serverUrl() || !isWeak(text, wordAll)) return null;
    const hits = await fetchHits(text, serverUrl());
    return hits && hits.length ? blend(items, text, wordAll, hits) : null;
  }

  root.OISearchAI = { isWeak, blend, sections, fetchHits, improve, serverUrl, WEAK, K, FLOOR };
})(typeof window !== 'undefined' ? window : globalThis);
