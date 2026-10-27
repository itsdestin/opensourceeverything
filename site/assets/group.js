// Group page: highlights the closed app a visitor searched for (?compare=<app>), and the sort dropdown.
(function () {
  const setCompare = (app) => {
    const chip = [...document.querySelectorAll('[data-app]')].find((c) => c.dataset.app === app);
    if (!chip) return;
    chip.classList.add('hl');
    document.querySelectorAll('[data-compare-name]').forEach((el) => { el.textContent = app; });
  };
  const sortBy = (key) => {
    const grid = document.querySelector('.grid[data-alts]'); if (!grid) return; // WHY .grid: in the server build the liked strip also carries data-alts and came first, so sorting did nothing
    const cards = [...grid.children];
    const cmp = {
      fit: (a, b) => +a.dataset.order - +b.dataset.order,
      // WHY a stable partition: Easy before Advanced, and inside each the usual best-match order. Nothing is hidden.
      setup: (a, b) => (a.dataset.setup === 'easy' ? 0 : 1) - (b.dataset.setup === 'easy' ? 0 : 1) || +a.dataset.order - +b.dataset.order,
      stars: (a, b) => +b.dataset.stars - +a.dataset.stars || a.dataset.name.localeCompare(b.dataset.name),
      name: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
    }[key];
    if (!cmp) return;
    cards.sort(cmp).forEach((c) => grid.appendChild(c));
    document.querySelectorAll('[data-sort]').forEach((o) => o.classList.toggle('sel', o.dataset.sort === key));
    const label = document.querySelector(`[data-sort="${key}"]`);
    document.querySelector('[data-sort-label]').textContent = label ? label.textContent : '';
  };
  // "Works on" filter: hides cards that don't run on the chosen device; every list on the page follows it.
  const APPS = ['windows', 'mac', 'linux', 'android', 'ios', 'web'];
  const filterBy = (key) => {
    document.querySelectorAll('[data-alts]').forEach((grid) => {
      let shown = 0;
      [...grid.children].forEach((c) => {
        const pl = (c.dataset.platforms || '').split(' ');
        const ok = !key || (key === 'noserver' ? pl.some((x) => APPS.includes(x)) : pl.includes(key));
        c.hidden = !ok; if (ok) shown++;
      });
      const none = grid.nextElementSibling;
      if (none && none.hasAttribute('data-nomatch')) none.hidden = shown > 0;
    });
    document.querySelectorAll('[data-device]').forEach((o) => o.classList.toggle('sel', o.dataset.device === key));
    const opt = document.querySelector(`[data-device="${key}"]`);
    document.querySelectorAll('[data-device-label]').forEach((l) => { l.textContent = key ? `Works on: ${opt.textContent}` : 'All devices'; });
  };
  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-device]');
    if (f) { filterBy(f.dataset.device); f.closest('.menu').classList.remove('open'); return; }
    const s = e.target.closest('[data-sort]');
    if (s) { sortBy(s.dataset.sort); s.closest('.menu').classList.remove('open'); }
  });
  const q = new URLSearchParams(location.search).get('compare');
  if (q) setCompare(q);
})();
