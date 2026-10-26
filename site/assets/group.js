// Group page: highlights the closed app a visitor searched for (?compare=<app>), and the sort dropdown.
(function () {
  const setCompare = (app) => {
    const chip = [...document.querySelectorAll('[data-app]')].find((c) => c.dataset.app === app);
    if (!chip) return;
    chip.classList.add('hl');
    document.querySelectorAll('[data-compare-name]').forEach((el) => { el.textContent = app; });
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
    const s = e.target.closest('[data-sort]');
    if (s) { sortBy(s.dataset.sort); s.closest('.menu').classList.remove('open'); }
  });
  const q = new URLSearchParams(location.search).get('compare');
  if (q) setCompare(q);
})();
