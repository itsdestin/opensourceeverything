// The search results page (src/pages/search.mjs): one ranked list, each result with how well it matches and why.
// Ranking comes from search-core.js (the same as the dropdown); this file only draws it and runs the filters.
(function () {
  const list = document.querySelector('[data-sres-list]');
  if (!list) return;
  const { base: BASE, esc } = window.OI;
  let q = new URLSearchParams(location.search).get('q')?.trim() || '';
  const sub = document.querySelector('[data-sres-sub]');
  const filters = document.querySelector('[data-sres-filters]');
  const input = document.querySelector('[data-sres-input]');
  input.value = q; // the search box lives on this page now: typing here re-runs the search in place

  const DEVICE = { windows: 'Windows', mac: 'Mac', linux: 'Linux', android: 'Android', ios: 'iPhone', web: 'In your browser' };
  const GRID = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
  let kind = 'all', setupF = ''; const devices = new Set();
  let results = [], details = null;
  const count = (n) => `${n} ${n === 1 ? 'result' : 'results'}`;

  // ───────── A result row (Destin picked option a in the redesign round, with fixes) ─────────
  // WHY: one picture box of ONE size at the left for every kind, the name, a two-line description and ONE chip row that scrolls sideways.
  // Stars come first in that row (Destin: "stars should be the first thing shown"). The strength meter and the "Open project" tag are gone: the
  // list is already best-first and the whole site is open projects. Only the two kinds that are NOT an open project say so, quietly.
  // The match strength sits bare at the top right of the row, in line with the name (Destin: keep the scoring, but not as a chip).
  const meter = (r) => `<span class="mstr l${r.level}" title="How well this matches your search"><span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${esc(r.strength)}</span>`;
  const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n));
  const STAR = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z"/></svg>';
  function row(r) {
    const id = r.u.split('/')[1]; let thumb, summary = '', chips = [];
    if (r.kind === 'project') {
      const p = details.projects.get(id); const shot = p?.thumbs?.[0];
      thumb = shot ? `<img src="${BASE}${esc(shot)}" alt="" loading="lazy">` : `<span class="letter">${esc(r.n[0])}</span>`;
      summary = p?.summary || '';
      chips.push(p?.stars ? `<span class="chip" title="${p.stars.toLocaleString('en')} stars on GitHub">${STAR}${fmt(p.stars)}</span>` : '');
      const dv = (p?.platforms || []).filter((x) => DEVICE[x]).map((x) => DEVICE[x]).join(' · ');
      if (dv) chips.push(`<span class="chip">${esc(dv)}</span>`);
    } else if (r.kind === 'group') {
      const g = details.groups.get(id);
      thumb = ''; // WHY no picture (reviewer, round 5): a placeholder icon looked like a missing screenshot; groups and closed apps are plain rows
      // WHY no job sentence (Destin, Oct 27): the group's name already says it; what it replaces is the new information.
      // WHY the fallback: a group with no paid rival (taxonomy-v2) has no "Replaces" line; its job says what it is.
      summary = g ? (g.closed.length ? `Replaces ${g.closed.slice(0, 4).join(', ')}${g.closed.length > 4 ? '…' : ''}.` : (g.job ?? '')) : '';
      if (g) chips.push(`<span class="chip">${g.alternatives.length} open ${g.alternatives.length === 1 ? 'option' : 'options'}</span>`);
    } else {
      thumb = '';
      summary = 'See open alternatives';
      chips.push('<span class="chip">Closed app</span>');
    }
    // Only reasons that mean something to a visitor: the group a project is in, and "Looking for kbin?" hints.
    for (const w of r.why) if (/^In /.test(w.text) || /^Looking for/.test(w.text)) chips.push(`<span class="chip why">${esc(w.text)}</span>`);
    return `<a class="card sr" href="${BASE}${esc(r.u)}">${thumb ? `<div class="sr-thumb">${thumb}</div>` : ''}
      <div class="sr-body"><div class="sr-top"><h3>${esc(r.n)}</h3>${meter(r)}</div>${summary ? `<p class="sr-sum">${esc(summary)}</p>` : ''}
      <div class="chiprow">${chips.filter(Boolean).join('')}</div></div></a>`;
  }

  function draw() {
    // WHY devices filter only open projects: groups and closed apps aren't tied to one device.
    const proj = (r) => details.projects.get(r.u.split('/')[1]);
    const shown = results.filter((r) => (kind === 'all' || r.kind === kind) &&
      (!devices.size || r.kind !== 'project' || r.pl.some((p) => devices.has(p))) &&
      (!setupF || r.kind !== 'project' || ((proj(r)?.setup === 'easy') === (setupF === 'easy'))));
    // Counts at the right of every option, and the live "Show N results" button (Destin, round 5).
    const projs = results.filter((r) => r.kind === 'project');
    for (const k of ['project', 'group', 'closed']) { const el = document.querySelector(`[data-count="${k}"]`); if (el) el.textContent = results.filter((r) => k === 'all' || r.kind === k).length; }
    for (const d of Object.keys(DEVICE)) { const el = document.querySelector(`[data-dcount="${d}"]`); if (el) el.textContent = projs.filter((r) => r.pl.includes(d)).length; }
    for (const k of ['', 'easy', 'advanced']) { const el = document.querySelector(`[data-scount="${k}"]`); if (el) if (el) el.textContent = k ? projs.filter((r) => (proj(r)?.setup === 'easy') === (k === 'easy')).length : ''; }
    const show = document.querySelector('[data-fshow]'); if (show) show.textContent = `Show ${shown.length} ${shown.length === 1 ? 'result' : 'results'}`;
    sub.textContent = results.length ? (shown.length === results.length ? count(results.length) : `${shown.length} of ${results.length}`) : '';
    // WHY (Destin, Oct 30 screenshot): search needs two letters; one letter (or an empty box) is not "nothing matches".
    list.innerHTML = q.length < 2 ? '<div class="empty">Type at least two letters.</div>' : shown.length ? shown.slice(0, 60).map(row).join('') :
      /* WHY: nothing found usually means a closed app is missing, so "Suggest it" opens the add-closed-app form with the searched name filled in (it used to open the new-group form). */ `<div class="empty">Nothing matches${devices.size ? ' with those devices' : ''}. ${devices.size ? 'Try fewer filters, or ' : ''}<a href="https://github.com/itsdestin/opensourceeverything/issues/new?template=3-add-closed-app.yml&app=${encodeURIComponent(q)}" rel="noopener">suggest what's missing</a>.</div>`;
  }

  // The Filter menu: Type (one choice), Works on (several), Setup (one choice). It stays open while you choose; the button shows how many are on.
  const fbtn = document.querySelector('[data-sres-filterbtn]'), fcount = document.querySelector('[data-fcount]');
  const showCount = () => { const n = (kind !== 'all') + devices.size + !!setupF; fcount.hidden = !n; fcount.textContent = n; fbtn.classList.toggle('on', !!n); };
  const sync = () => {
    filters.querySelectorAll('[data-kind]').forEach((x) => { const on = x.dataset.kind === kind; x.classList.toggle('sel', on); x.setAttribute('aria-checked', String(on)); });
    filters.querySelectorAll('[data-setupf]').forEach((x) => { const on = x.dataset.setupf === setupF; x.classList.toggle('sel', on); x.setAttribute('aria-checked', String(on)); });
    filters.querySelectorAll('[data-device]').forEach((x) => { const on = devices.has(x.dataset.device); x.classList.toggle('sel', on); x.setAttribute('aria-checked', String(on)); });
    showCount();
  };
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.kind) kind = b.dataset.kind;
    else if (b.dataset.setupf !== undefined) setupF = b.dataset.setupf;
    else if (b.dataset.clear) { kind = 'all'; setupF = ''; devices.clear(); }
    else if (b.dataset.device) { const d = b.dataset.device; devices.has(d) ? devices.delete(d) : devices.add(d); }
    else if (b.hasAttribute('data-fshow')) { filters.classList.remove('open'); fbtn.setAttribute('aria-expanded', 'false'); return; }
    sync(); draw();
  });
  // Phone sheet: drag the handle down to close it.
  const handle = filters.querySelector('[data-handle]'); let y0 = null;
  handle.addEventListener('pointerdown', (e) => { y0 = e.clientY; handle.setPointerCapture(e.pointerId); });
  handle.addEventListener('pointermove', (e) => { if (y0 != null) filters.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`; });
  handle.addEventListener('pointerup', (e) => { if (y0 != null && e.clientY - y0 > 70) { filters.classList.remove('open'); fbtn.setAttribute('aria-expanded', 'false'); } filters.style.transform = ''; y0 = null; });

  // One search at a time: the details load once, then every keystroke ranks again and redraws.
  let ctx = null, stamp = 0;
  async function run() {
    const my = ++stamp;
    if (!q) { results = []; sub.textContent = ''; list.innerHTML = '<div class="empty">Type what you\'re looking for.</div>'; return; }
    document.title = `${q} · Search · Open Source Everything`;
    results = window.OISearch.search(ctx.items, q, { all: true });
    
    draw();
    // Meaning search (search-ai.js): when the word match is weak, reorder by meaning once the server answers; if it is slow or off, the list stays.
    const better = await window.OISearchAI?.improve(ctx.items, q, results).catch(() => null);
    if (better && my === stamp) { results = better; draw(); }
  }
  let t = null;
  input.addEventListener('input', () => { q = input.value.trim(); clearTimeout(t); t = setTimeout(() => { try { history.replaceState(null, '', `?q=${encodeURIComponent(q)}`); } catch { /* fine */ } if (ctx) run(); }, 160); });

  // WHY search-details.json (Oct 30 performance pass): this page downloaded the full open-data files (1.2 MB) to use six fields;
  // the build writes just those fields (site/build.mjs), about a fifth of the size.
  Promise.all([
    window.OI.loadSearch(),
    fetch(BASE + 'search-details.json').then((r) => r.json()),
  ]).then(([items, sd]) => {
    details = { projects: new Map(Object.entries(sd.projects)), groups: new Map(Object.entries(sd.groups)) };
    ctx = { items }; return run();
  }).catch(() => { list.innerHTML = '<div class="empty">Search couldn\'t load. Check your connection and reload the page.</div>'; });
})();
