// Group page: "Must have" filter, Cards / Compare switch, and the tap-for-note cells of the compare table.
// Also loaded on other pages, where it finds nothing to do.
(function () {
  const OI = window.OI || {};
  // Switch guide: the first fold is open on desktop and closed on a phone (Destin, round 5).
  if (matchMedia('(max-width:640px)').matches) document.querySelectorAll('.foldrow[data-first]').forEach((d) => d.removeAttribute('open'));
  const grid = document.querySelector('.grid[data-alts]'); // WHY .grid: the liked strip also has data-alts
  const cmp = document.querySelector('[data-compare]');
  const none = document.querySelector('[data-must-none]');
  const sel = new Set();
  let view = 'cards';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // WHY yes only: "Must have" means it really has it. Partly and not-checked-yet never match.
  const apply = () => {
    if (!grid) return;
    const cards = [...grid.children];
    cards.forEach((c) => { const has = (c.dataset.feat || '').split(' '); c.classList.toggle('feat-out', ![...sel].every((t) => has.includes(t))); });
    const shown = (c) => !c.hidden && !c.classList.contains('feat-out');
    if (cmp) cmp.querySelectorAll('tbody tr').forEach((r) => { const c = cards.find((x) => x.dataset.pid === r.dataset.pid); r.hidden = !c || !shown(c); });
    if (none) none.hidden = !sel.size || cards.some(shown);
    const label = document.querySelector('[data-must-label]');
    if (label) label.textContent = sel.size ? `Must have: ${sel.size}` : 'Must have';
    document.querySelectorAll('[data-must]').forEach((o) => { const on = sel.has(o.dataset.must); o.setAttribute('aria-selected', String(on)); o.setAttribute('aria-checked', String(on)); o.classList.toggle('sel', on); });
  };
  const setView = (v) => {
    view = v;
    if (grid) grid.hidden = v === 'compare';
    if (cmp) cmp.hidden = v !== 'compare';
    document.querySelectorAll('[data-view]').forEach((b) => { const on = b.dataset.view === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    apply();
  };

  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-must]');
    if (m) { sel.has(m.dataset.must) ? sel.delete(m.dataset.must) : sel.add(m.dataset.must); apply(); return; }
    if (e.target.closest('[data-must-clear]')) { sel.clear(); apply(); return; }
    const v = e.target.closest('[data-view]');
    if (v) { setView(v.dataset.view); return; }
    // The device filter hides cards too; keep the table rows in step with it.
    if (e.target.closest('[data-device]')) setTimeout(apply, 0);
    const cell = e.target.closest('.cell');
    if (cell && OI.tip) {
      const body = `${cell.dataset.note ? `<p class="tipnote">${esc(cell.dataset.note)}</p>` : ''}${cell.dataset.src ? `<p><a href="${esc(cell.dataset.src)}" rel="noopener">Source</a></p>` : ''}`;
      OI.tip(cell, `${esc(cell.dataset.name)}: ${esc(cell.dataset.v)}`, body || '<p class="tipsub">No note.</p>');
      return;
    }
    const h = e.target.closest('.cmph');
    if (h && OI.tip) OI.tip(h, esc(h.dataset.name), `<p>${esc(h.dataset.q)}</p><p class="tipsub">${esc(h.dataset.m)}</p>`);
  });
})();
