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

  // ── Phones: the Search tab, and side sections that fold (mobile.css) ──
  const phone = matchMedia('(max-width:640px)');
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-open-search]')) return;
    // WHY two cases: the home page has its own big search box; other pages slide the search bar down from the top.
    const hero = document.querySelector('.hero3 [data-search] input');
    if (hero) { hero.scrollIntoView({ block: 'center', behavior: 'smooth' }); hero.focus(); return; }
    document.body.classList.add('searching');
    const input = document.querySelector('.top [data-search] input'); input?.focus();
  });
  document.addEventListener('focusout', (e) => {
    if (!document.body.classList.contains('searching') || !e.target.closest('.top')) return;
    setTimeout(() => { if (!document.activeElement?.closest('.top')) document.body.classList.remove('searching'); }, 150);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.body.classList.remove('searching'); });
  // WHY folded on phones: the main content comes first; "Before you build", "About this page" and the like open on a tap.
  document.querySelectorAll('.fold-phone').forEach((sec) => {
    if (phone.matches) sec.classList.add('folded');
    const head = sec.querySelector(':scope > .fold-head');
    head?.setAttribute('role', 'button'); head?.setAttribute('tabindex', '0');
    const toggle = () => { if (phone.matches) { sec.classList.toggle('folded'); head.setAttribute('aria-expanded', String(!sec.classList.contains('folded'))); } };
    head?.addEventListener('click', toggle);
    head?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });
})();
