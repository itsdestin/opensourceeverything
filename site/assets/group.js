// Group page: the "Compared with" dropdown (also read from ?compare=<app>) and the sort dropdown.
(function () {
  const setCompare = (app) => {
    const opts = [...document.querySelectorAll('[data-compare]')];
    const all = opts.map((o) => o.dataset.compare);
    if (!all.includes(app)) return;
    opts.forEach((o) => o.classList.toggle('sel', o.dataset.compare === app));
    document.querySelectorAll('[data-compare-label],[data-compare-name]').forEach((el) => { el.textContent = app; });
    const also = document.querySelector('[data-also]');
    if (also) also.textContent = 'Also replaces ' + all.filter((a) => a !== app).join(', ');
  };
  const sortBy = (key) => {
    const grid = document.querySelector('[data-alts]'); if (!grid) return;
    const cards = [...grid.children];
    const cmp = {
      fit: (a, b) => +a.dataset.order - +b.dataset.order,
      stars: (a, b) => +b.dataset.stars - +a.dataset.stars || a.dataset.name.localeCompare(b.dataset.name),
      name: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
    }[key];
    if (!cmp) return;
    cards.sort(cmp).forEach((c) => grid.appendChild(c));
    document.querySelectorAll('[data-sort]').forEach((o) => o.classList.toggle('sel', o.dataset.sort === key));
    const label = document.querySelector(`[data-sort="${key}"]`);
    document.querySelector('[data-sort-label]').textContent = label ? label.textContent : '';
  };
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-compare]');
    if (c) { setCompare(c.dataset.compare); c.closest('.menu').classList.remove('open'); window.OI?.toast?.('Comparing with ' + c.dataset.compare); }
    const s = e.target.closest('[data-sort]');
    if (s) { sortBy(s.dataset.sort); s.closest('.menu').classList.remove('open'); }
  });
  const q = new URLSearchParams(location.search).get('compare');
  if (q) setCompare(q);
})();
