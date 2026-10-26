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
  let index = null, loading = null;
  const loadIndex = () => loading || (loading = fetch(BASE + 'search.json').then((r) => r.json()).then((d) => (index = d)));
  function results(t) {
    const q = t.trim().toLowerCase(); if (!q) return '';
    const hit = (s) => s.toLowerCase().includes(q);
    const rank = (s) => (s.toLowerCase().startsWith(q) ? 0 : 1);
    const pick = (list, n) => list.filter((x) => hit(x.n)).sort((a, b) => rank(a.n) - rank(b.n)).slice(0, n);
    const row = (x, label) => `<a class="mi" role="option" href="${BASE}${x.u}">${esc(x.n)}<span class="muted11">${esc(label(x))}</span></a>`;
    const closed = pick(index.closed, 6).map((x) => row(x, (x) => x.g));
    const groups = pick(index.groups, 4).map((x) => row(x, (x) => x.c));
    const projects = pick(index.projects, 6).map((x) => row(x, (x) => x.g));
    return (closed.length ? '<div class="menu-note">Closed apps</div>' + closed.join('') : '') +
      (groups.length ? '<div class="menu-note">Groups</div>' + groups.join('') : '') +
      (projects.length ? '<div class="menu-note">Open projects</div>' + projects.join('') : '') ||
      `<div class="menu-note">Nothing matches "${esc(t.trim())}" yet. <a href="https://github.com/itsdestin/opensourceeverything/issues/new?template=4-new-group.yml&closed=${encodeURIComponent(t.trim())}" rel="noopener">Suggest it</a>.</div>`;
  }
  document.querySelectorAll('[data-search]').forEach((wrap) => {
    const input = wrap.querySelector('input'); const menu = wrap.querySelector('.search-menu');
    const update = async () => {
      if (!input.value.trim()) { menu.classList.remove('open'); return; }
      await loadIndex(); menu.innerHTML = results(input.value); menu.classList.add('open');
    };
    input.addEventListener('input', update);
    input.addEventListener('focus', () => { loadIndex(); if (input.value.trim()) update(); });
    input.addEventListener('keydown', (e) => {
      const items = [...menu.querySelectorAll('.mi')]; const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); items[0].focus(); }
      if (e.key === 'Enter' && items.length) { e.preventDefault(); items[0].click(); }
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
})();
