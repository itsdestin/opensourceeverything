// The search results page (src/pages/search.mjs): one ranked list, each result with how well it matches and why.
// Ranking comes from search-core.js (the same as the dropdown); this file only draws it and runs the filters.
(function () {
  const list = document.querySelector('[data-sres-list]');
  if (!list) return;
  const { base: BASE, esc } = window.OI;
  const q = new URLSearchParams(location.search).get('q')?.trim() || '';
  const title = document.querySelector('[data-sres-title]'), sub = document.querySelector('[data-sres-sub]');
  const filters = document.querySelector('[data-sres-filters]');
  // Put the search back in the box, so it can be changed in place.
  document.querySelectorAll('[data-search] input').forEach((i) => { i.value = q; });
  if (!q) { list.innerHTML = '<div class="empty">Type what you\'re looking for in the search box above.</div>'; return; }
  document.title = `${q} · Search · Open Source Everything`;
  title.textContent = `Results for “${q}”`;

  const DEVICE = { windows: 'Windows', mac: 'Mac', linux: 'Linux', android: 'Android', ios: 'iPhone', web: 'In your browser' };
  const GRID = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
  let kind = 'all', setupF = ''; const devices = new Set();
  let results = [], details = null;

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
      thumb = `<span class="icon">${GRID}</span>`;
      // WHY no job sentence (Destin, Oct 27): the group's name already says it; what it replaces is the new information.
      summary = g ? `Replaces ${g.closed.slice(0, 4).join(', ')}${g.closed.length > 4 ? '…' : ''}.` : '';
      if (g) chips.push(`<span class="chip">${g.alternatives.length} open ${g.alternatives.length === 1 ? 'option' : 'options'}</span>`);
    } else {
      thumb = `<span class="letter closed">${esc(r.n[0])}</span>`;
      summary = 'Not open source. Its page lists the open-source apps that replace it.';
      chips.push('<span class="chip">Closed app</span>');
    }
    // Only reasons that mean something to a visitor: the group a project is in, and "Looking for kbin?" hints.
    for (const w of r.why) if (/^In /.test(w.text) || /^Looking for/.test(w.text)) chips.push(`<span class="chip why">${esc(w.text)}</span>`);
    return `<a class="card sr" href="${BASE}${esc(r.u)}"><div class="sr-thumb">${thumb}</div>
      <div class="sr-body"><div class="sr-top"><h3>${esc(r.n)}</h3>${meter(r)}</div>${summary ? `<p class="sr-sum">${esc(summary)}</p>` : ''}
      <div class="chiprow">${chips.filter(Boolean).join('')}</div></div></a>`;
  }

  function draw() {
    // WHY devices filter only open projects: groups and closed apps aren't tied to one device.
    const proj = (r) => details.projects.get(r.u.split('/')[1]);
    const shown = results.filter((r) => (kind === 'all' || r.kind === kind) &&
      (!devices.size || r.kind !== 'project' || r.pl.some((p) => devices.has(p))) &&
      (!setupF || r.kind !== 'project' || ((proj(r)?.setup === 'easy') === (setupF === 'easy'))));
    for (const k of ['all', 'project', 'group', 'closed']) {
      const n = results.filter((r) => k === 'all' || r.kind === k).length;
      const el = document.querySelector(`[data-count="${k}"]`); if (el) el.textContent = n;
    }
    list.innerHTML = shown.length ? shown.slice(0, 60).map(row).join('') :
      /* WHY: nothing found usually means a closed app is missing, so "Suggest it" opens the add-closed-app form with the searched name filled in (it used to open the new-group form). */ `<div class="empty">Nothing matches${devices.size ? ' with those devices' : ''}. ${devices.size ? 'Try fewer filters, or ' : ''}<a href="https://github.com/itsdestin/opensourceeverything/issues/new?template=3-add-closed-app.yml&app=${encodeURIComponent(q)}" rel="noopener">suggest what's missing</a>.</div>`;
  }

  // The three menus: Type (one choice), Works on (several, stays open while you tick), Setup (one choice). Each button says what is chosen.
  const label = (key, text, on) => { const el = filters.querySelector(`[data-flabel="${key}"]`); el.textContent = text; el.closest('.select').classList.toggle('on', on); };
  const NAME = { project: 'Projects', group: 'Groups', closed: 'Closed apps' };
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button.mi'); if (!b) return;
    if (b.dataset.kind) {
      kind = b.dataset.kind; filters.querySelectorAll('[data-kind]').forEach((x) => x.classList.toggle('sel', x === b)); label('type', kind === 'all' ? 'Type' : `Type: ${NAME[kind]}`, kind !== 'all'); b.closest('.menu').classList.remove('open');
    } else if (b.dataset.setupf !== undefined) {
      setupF = b.dataset.setupf; filters.querySelectorAll('[data-setupf]').forEach((x) => x.classList.toggle('sel', x === b)); label('setup', setupF ? `Setup: ${setupF === 'easy' ? 'Easy' : 'Advanced'}` : 'Setup', !!setupF); b.closest('.menu').classList.remove('open');
    } else {
      if (b.dataset.clear) devices.clear(); else { const d = b.dataset.device; devices.has(d) ? devices.delete(d) : devices.add(d); }
      filters.querySelectorAll('[data-device]').forEach((x) => { x.classList.toggle('sel', devices.has(x.dataset.device)); x.setAttribute('aria-selected', String(devices.has(x.dataset.device))); });
      const names = [...devices].map((d) => DEVICE[d]); label('dev', !names.length ? 'Works on' : names.length < 3 ? `Works on: ${names.join(', ')}` : `Works on: ${names.length} devices`, !!names.length);
    }
    draw();
  });

  Promise.all([
    window.OI.loadSearch(),
    fetch(BASE + 'data/projects.json').then((r) => r.json()),
    fetch(BASE + 'data/groups.json').then((r) => r.json()),
  ]).then(([items, pj, gj]) => {
    details = { projects: new Map(pj.projects.map((p) => [p.id, p])), groups: new Map(gj.groups.map((g) => [g.id, g])) };
    results = window.OISearch.search(items, q, { all: true });
    sub.textContent = results.length
      ? `${results.length} ${results.length === 1 ? 'result' : 'results'}, best match first.`
      : 'No results.';
    filters.hidden = !results.length;
    draw();
    // Meaning search (search-ai.js): when the word match is weak, reorder by meaning once the server answers.
    // If it is slow, down or switched off, the list above simply stays.
    return window.OISearchAI?.improve(items, q, results).then((better) => {
      if (!better) return;
      results = better;
      sub.textContent = `${results.length} ${results.length === 1 ? 'result' : 'results'}, best match first, ordered partly by what your words mean..`;
      filters.hidden = !results.length; draw();
    });
  }).catch(() => { list.innerHTML = '<div class="empty">Search couldn\'t load. Check your connection and reload the page.</div>'; });
})();
