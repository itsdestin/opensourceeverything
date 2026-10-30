// Open Source Everything: the small amount of JavaScript every page shares.
// Search (loads search.json the first time the box is used), dropdown menus, copy buttons and the toast.
(function () {
  const BASE = (window.OI && window.OI.base) || '/';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }
  window.OI = Object.assign(window.OI || {}, { toast, esc });

  // ── Search ──
  // WHY lazy: the index is only needed once someone types, so pages load without it.
  // The ranking itself lives in search-core.js, shared with the tests (site/test/search-eval.mjs).
  let index = null, loading = null;
  const loadIndex = () => loading || (loading = fetch(BASE + 'search.json').then((r) => r.json()).then((d) => (index = window.OISearch.prepare(d))));
  window.OI.loadSearch = loadIndex; // the results page (search-page.js) shares the same loaded index
  const HEADINGS = { closed: 'Closed apps', group: 'Groups', project: 'Open projects' };
  const resultsUrl = (t) => `${BASE}search/?q=${encodeURIComponent(t.trim())}`;
  function results(t, better) {
    if (!t.trim()) return '';
    // WHY a small meter on each row (Destin, Oct 26: "more visible relevance scoring"): how well each result fits,
    // at a glance; the words are in its tooltip and on the results page.
    const row = (x) => `<a class="mi" role="option" href="${BASE}${x.u}">${esc(x.n)}<span class="mi-right"><span class="muted11">${esc(x.label)}</span>` +
      `<span class="mstr mini l${x.level}" title="${esc(x.strength)}" aria-label="${esc(x.strength)}"><span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span></span></span></a>`;
    // WHY sections come in the order of their best match: a job search opens on the group, a name on the app.
    const secs = better || window.OISearch.search(index, t);
    // WHY a "see all" row: Enter opens the full list; this says so, and works for mouse and touch too.
    return secs.length
      ? secs.map((sec) => `<div class="menu-note">${HEADINGS[sec.kind]}</div>` + sec.items.map(row).join('')).join('') +
        `<a class="mi see-all" role="option" href="${resultsUrl(t)}">See all results for “${esc(t.trim())}”<span class="muted11">Enter ↵</span></a>`
      : /* WHY: nothing found usually means a closed app is missing, so "Suggest it" opens the add-closed-app form with the searched name filled in (it used to open the new-group form). */ `<div class="menu-note">Nothing matches "${esc(t.trim())}" yet. <a href="https://github.com/itsdestin/opensourceeverything/issues/new?template=3-add-closed-app.yml&app=${encodeURIComponent(t.trim())}" rel="noopener">Suggest it</a>.</div>`;
  }
  document.querySelectorAll('[data-search]').forEach((wrap) => {
    const input = wrap.querySelector('input'); const menu = wrap.querySelector('.search-menu');
    const update = async () => {
      if (!input.value.trim()) { menu.classList.remove('open'); return; }
      await loadIndex(); menu.innerHTML = results(input.value); menu.classList.add('open');
      // Meaning search (search-ai.js): only when the word match is weak, after a short pause in typing, and only
      // if the box still holds the same text when the answer arrives. If the server is slow or down, nothing changes.
      const t = input.value; clearTimeout(aiTimer);
      if (window.OISearchAI?.serverUrl()) aiTimer = setTimeout(async () => {
        const all = await window.OISearchAI.improve(index, t, window.OISearch.search(index, t, { all: true }));
        if (all && input.value === t) menu.innerHTML = results(t, window.OISearchAI.sections(all));
      }, 350);
    };
    let aiTimer;
    input.addEventListener('input', update);
    input.addEventListener('focus', () => { loadIndex(); if (input.value.trim()) update(); });
    input.addEventListener('keydown', (e) => {
      const items = [...menu.querySelectorAll('.mi')]; const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); items[0].focus(); }
      // WHY Enter opens the results page, not the first item (Destin, Oct 26): the first item is only a guess;
      // to jump to one item, arrow down to it and press Enter.
      if (e.key === 'Enter' && input.value.trim()) { e.preventDefault(); location.href = resultsUrl(input.value); }
      void i;
    });
    menu.addEventListener('keydown', (e) => {
      const items = [...menu.querySelectorAll('.mi')]; const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[i]).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (i > 0 ? items[i - 1] : input).focus(); }
    });
  });

  // ── Menus: a button with data-menu="<id>" toggles that menu; clicking outside closes it ──
  const closeMenus = (except) => document.querySelectorAll('.menu.open').forEach((m) => { if (m !== except) m.classList.remove('open'); });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-menu]');
    if (btn) { const m = document.getElementById(btn.dataset.menu); const was = m.classList.contains('open'); closeMenus(); m.classList.toggle('open', !was); btn.setAttribute('aria-expanded', String(!was)); return; }
    if (!e.target.closest('.menu') && !e.target.closest('[data-search]')) closeMenus();
    // Copy buttons: data-copy="<id of element whose text to copy>", data-copied="<toast text>"
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      const text = document.getElementById(copy.dataset.copy)?.textContent ?? '';
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
        .then(() => toast(copy.dataset.copied || 'Copied.'), () => toast('Copying needs the page open in a browser tab.'));
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

  // ── Phones: the Search tab, and side sections that fold (mobile.css) ──
  const phone = matchMedia('(max-width:640px)');
  // (The old slide-down search bar is gone: the top bar has a magnifier that opens the search page.)
  // WHY folded on phones: the main content comes first; "Before you build", "About this page" and the like open on a tap.
  const foldInit = (sec) => {
    if (phone.matches) sec.classList.add('folded');
    const head = sec.querySelector(':scope > .fold-head');
    head?.setAttribute('role', 'button'); head?.setAttribute('tabindex', '0');
    const toggle = () => { if (phone.matches) { sec.classList.toggle('folded'); head.setAttribute('aria-expanded', String(!sec.classList.contains('folded'))); } };
    // WHY ignore buttons and links inside the heading row: "Add a note" must not also fold the card.
    head?.addEventListener('click', (e) => { if (!e.target.closest('button, a')) toggle(); });
    head?.addEventListener('keydown', (e) => { if (e.target === head && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } });
  };
  window.OI = window.OI || {}; window.OI.foldInit = foldInit; // contrib.js folds the sections it draws later
  document.querySelectorAll('.fold-phone').forEach(foldInit);
  // Home page area rows (<details>): on phones start with only Everyday apps open (Destin, hierarchy deck, Oct 30).
  // WHY keep a row open when a link points at it (#area-…): a category page's breadcrumb lands on that area's row.
  if (phone.matches) document.querySelectorAll('details.arearow:not([data-keep-open])').forEach((el) => { if (location.hash !== `#${el.id}`) el.open = false; });
  addEventListener('hashchange', () => { const el = document.querySelector(`details.arearow${location.hash.replace(/[^#\w-]/g, '')}`); if (el) el.open = true; });

  // ── Chip rows fade only on the side that has more to scroll to (design guide, Cards) ──
  // WHY JS: CSS can't tell whether a row overflows. Rows drawn later (search results, social) are caught by the observer.
  const edge = (r) => {
    const over = r.scrollWidth - r.clientWidth;
    r.classList.toggle('more-l', over > 1 && r.scrollLeft > 1);
    r.classList.toggle('more-r', over > 1 && r.scrollLeft < over - 1);
  };
  const allRows = () => document.querySelectorAll('.chiprow').forEach(edge);
  document.addEventListener('scroll', (e) => { if (e.target.classList?.contains('chiprow')) edge(e.target); }, true);
  addEventListener('resize', allRows);
  let pend = 0;
  new MutationObserver(() => { cancelAnimationFrame(pend); pend = requestAnimationFrame(allRows); }).observe(document.body, { childList: true, subtree: true });
  allRows();
})();
