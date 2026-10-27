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

  const KIND = { project: 'Open project', group: 'Group', closed: 'Closed app' };
  const DEVICE = { windows: 'Windows', mac: 'Mac', linux: 'Linux', android: 'Android', ios: 'iPhone', web: 'In your browser' };
  const GRID = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
  let kind = 'all'; const devices = new Set();
  let results = [], details = null;

  // WHY a four-step meter with words: the bars show strength at a glance, the words say what it means.
  const meter = (r) => `<span class="mstr l${r.level}" title="How well this matches your search"><span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${esc(r.strength)}</span>`;

  function row(r) {
    const id = r.u.split('/')[1];
    let thumb = '', summary = '', extra = '';
    if (r.kind === 'project') {
      const p = details.projects.get(id);
      const shot = p?.thumbs?.[0];
      thumb = shot ? `<img src="${BASE}${esc(shot)}" alt="" loading="lazy">` : `<span class="letter">${esc(r.n[0])}</span>`;
      summary = p?.summary || '';
      const dv = (p?.platforms || []).filter((x) => DEVICE[x]).map((x) => DEVICE[x]).join(' · ');
      if (dv) extra = `<span class="muted11">${esc(dv)}</span>`;
    } else if (r.kind === 'group') {
      const g = details.groups.get(id);
      thumb = `<span class="icon">${GRID}</span>`;
      summary = g ? `${g.job}. Replaces ${g.closed.slice(0, 4).join(', ')}${g.closed.length > 4 ? '…' : ''}.` : '';
      if (g) extra = `<span class="muted11">${g.alternatives.length} open ${g.alternatives.length === 1 ? 'option' : 'options'}</span>`;
    } else {
      thumb = `<span class="letter closed">${esc(r.n[0])}</span>`;
      summary = `A closed app${r.label ? ` (${r.label})` : ''}. Its page lists the open-source apps that replace it.`;
    }
    const why = r.why.length ? `<div class="sres-why"><span class="muted11">Why</span>${r.why.map((w) => `<span class="chip">${esc(w.text)}</span>`).join('')}</div>` : '';
    return `<a class="card sres" href="${BASE}${esc(r.u)}">
      <div class="sres-thumb">${thumb}</div>
      <div class="sres-body">
        <div class="sres-top"><h3>${esc(r.n)}</h3><span class="chip kind">${KIND[r.kind]}</span>${meter(r)}</div>
        ${summary ? `<p class="sres-sum">${esc(summary)}</p>` : ''}
        ${why}
        ${extra}
      </div>
    </a>`;
  }

  // ───────── Redesign round (preview builds): three cleaner result rows, picked with ?v=a|b|c ─────────
  // WHY (Destin: "these cards just have too much stuff poorly laid out"): one fact per place. The kind, the match and the devices
  // become chips in ONE row that scrolls sideways; the "Why" label and a separate devices line go away.
  const V = window.OI_V;
  const parts = (r) => {
    const id = r.u.split('/')[1]; let thumb, summary = '', devs = '';
    if (r.kind === 'project') {
      const p = details.projects.get(id); const shot = p?.thumbs?.[0];
      thumb = shot ? `<img src="${BASE}${esc(shot)}" alt="" loading="lazy">` : `<span class="letter">${esc(r.n[0])}</span>`;
      summary = p?.summary || ''; devs = (p?.platforms || []).filter((x) => DEVICE[x]).map((x) => DEVICE[x]).join(' · ');
    } else if (r.kind === 'group') {
      const g = details.groups.get(id); thumb = `<span class="icon">${GRID}</span>`;
      summary = g ? `${g.job}. Replaces ${g.closed.slice(0, 4).join(', ')}${g.closed.length > 4 ? '…' : ''}.` : '';
      devs = g ? `${g.alternatives.length} open ${g.alternatives.length === 1 ? 'option' : 'options'}` : '';
    } else { thumb = `<span class="letter closed">${esc(r.n[0])}</span>`; summary = 'A closed app. Its page lists the open-source apps that replace it.'; }
    return { thumb, summary, devs };
  };
  const strengthChip = (r) => `<span class="chip str l${r.level}" title="How well this matches your search"><span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${esc(r.strength)}</span>`;
  const whyText = (r) => r.why.map((w) => w.text).join(', ');
  function rowA(r) {
    const { thumb, summary, devs } = parts(r);
    return `<a class="card sr sra" href="${BASE}${esc(r.u)}"><div class="sr-thumb">${thumb}</div>
      <div class="sr-body"><h3>${esc(r.n)}</h3>${summary ? `<p class="sr-sum">${esc(summary)}</p>` : ''}
      <div class="chiprow"><span class="chip">${KIND[r.kind]}</span>${strengthChip(r)}${devs ? `<span class="chip">${esc(devs)}</span>` : ''}${r.why.map((w) => `<span class="chip">${esc(w.text)}</span>`).join('')}</div></div></a>`;
  }
  function rowB(r) {
    const { thumb, summary, devs } = parts(r);
    return `<a class="sr srb" href="${BASE}${esc(r.u)}" title="${esc(whyText(r) ? 'Matched: ' + whyText(r) : '')}"><div class="sr-thumb">${thumb}</div>
      <div class="sr-body"><h3>${esc(r.n)}</h3><div class="sr-sub">${esc([KIND[r.kind], devs].filter(Boolean).join(' · '))}</div>${summary ? `<p class="sr-sum">${esc(summary)}</p>` : ''}</div>
      <div class="sr-side">${meter(r)}</div></a>`;
  }
  function rowC(r, extra) {
    const { summary } = parts(r);
    return `<a class="sr src${extra ? ' extra' : ''}" href="${BASE}${esc(r.u)}"><div class="sr-body"><h3>${esc(r.n)}</h3>${summary ? `<p class="sr-sum">${esc(summary)}</p>` : ''}</div><div class="sr-side">${meter(r)}</div></a>`;
  }
  function drawV(shown) {
    list.className = `sres-list v-${V}`;
    if (V === 'a') return shown.slice(0, 60).map(rowA).join('');
    if (V === 'b') return `<div class="sr-box lvl1">${shown.slice(0, 60).map(rowB).join('')}</div>`;
    const LIM = 4, G = [['project', 'Open projects'], ['group', 'Groups'], ['closed', 'Closed apps']] /* WHY projects first: they are what a search is usually for; the first group is the one open on a phone */;
    return G.filter(([k]) => shown.some((r) => r.kind === k)).map(([k, label], gi) => {
      const rs = shown.filter((r) => r.kind === k);
      return `<section class="sgroup rfold${gi ? ' shut' : ''}" data-more-scope><div class="sec-head" data-fold><h2 class="h-large">${label}<span class="count">${rs.length}</span></h2></div>
        <div class="sr-box lvl1">${rs.slice(0, 40).map((r, i) => rowC(r, i >= LIM)).join('')}</div>
        ${rs.length > LIM ? `<button class="btn sm secondary showall" type="button" data-showall>Show all ${rs.length}</button>` : ''}</section>`;
    }).join('');
  }

  function draw() {
    // WHY devices filter only open projects: groups and closed apps aren't tied to one device.
    const shown = results.filter((r) => (kind === 'all' || r.kind === kind) &&
      (!devices.size || r.kind !== 'project' || r.pl.some((p) => devices.has(p))));
    for (const k of ['all', 'project', 'group', 'closed']) {
      const n = results.filter((r) => k === 'all' || r.kind === k).length;
      const el = document.querySelector(`[data-count="${k}"]`); if (el) el.textContent = n;
    }
    list.innerHTML = shown.length ? (V ? drawV(shown) : shown.slice(0, 60).map(row).join('')) :
      /* WHY: nothing found usually means a closed app is missing, so "Suggest it" opens the add-closed-app form with the searched name filled in (it used to open the new-group form). */ `<div class="empty">Nothing matches${devices.size ? ' with those devices' : ''}. ${devices.size ? 'Try fewer filters, or ' : ''}<a href="https://github.com/itsdestin/opensourceeverything/issues/new?template=3-add-closed-app.yml&app=${encodeURIComponent(q)}" rel="noopener">suggest what's missing</a>.</div>`;
  }

  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.kind) {
      kind = b.dataset.kind;
      filters.querySelectorAll('[data-kind]').forEach((x) => { x.classList.toggle('sel', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    } else {
      const d = b.dataset.device; devices.has(d) ? devices.delete(d) : devices.add(d);
      b.classList.toggle('sel', devices.has(d)); b.setAttribute('aria-pressed', String(devices.has(d)));
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
    sub.textContent = results.length && V ? `${results.length} ${results.length === 1 ? 'result' : 'results'}, best match first.` : results.length
      ? `${results.length} ${results.length === 1 ? 'result' : 'results'}, best match first. The bars show how well each one fits; “Why” shows what it matched.`
      : 'No results.';
    filters.hidden = !results.length;
    draw();
    // Meaning search (search-ai.js): when the word match is weak, reorder by meaning once the server answers.
    // If it is slow, down or switched off, the list above simply stays.
    return window.OISearchAI?.improve(items, q, results).then((better) => {
      if (!better) return;
      results = better;
      sub.textContent = `${results.length} ${results.length === 1 ? 'result' : 'results'}, best match first, ordered partly by what your words mean. The bars show how well each one fits; “Why” shows what it matched.`;
      filters.hidden = !results.length; draw();
    });
  }).catch(() => { list.innerHTML = '<div class="empty">Search couldn\'t load. Check your connection and reload the page.</div>'; });
})();
