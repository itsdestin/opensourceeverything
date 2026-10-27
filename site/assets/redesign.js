// The small explainer popover (YouCoded's AnchorTip) the cards and the Family card share.
// WHY one popover (YouCoded's AnchorTip): a chip, an (i) or a family chip opens a short explanation under itself; a second click,
// a click elsewhere or Esc closes it. On a phone it is as wide as the screen allows, like the app's popovers.
(function () {
  const OI = window.OI; if (!OI) return;
  let pop = null, anchor = null;
  const close = () => { if (pop) { pop.remove(); pop = null; } if (anchor) { anchor.setAttribute('aria-expanded', 'false'); anchor = null; } };
  // show(anchorElement, title, html): draws the popover under the anchor, kept inside the window.
  OI.tip = (a, title, html) => {
    if (anchor === a) return close();
    close(); anchor = a; a.setAttribute('aria-expanded', 'true');
    pop = document.createElement('div'); pop.className = 'tip'; pop.setAttribute('role', 'dialog');
    pop.innerHTML = `<div class="tip-h">${title}</div><div class="tip-b">${html}</div>`;
    document.body.appendChild(pop);
    const r = a.getBoundingClientRect(), w = Math.min(pop.querySelector('.wide') ? 380 : 320, innerWidth - 16);
    pop.style.width = w + 'px';
    pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + scrollX)) + 'px';
    pop.style.top = (r.bottom + scrollY + 6) + 'px';
  };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tip]');
    if (t) {
      e.preventDefault(); e.stopPropagation();
      const tpl = t.closest('[data-tipscope]')?.querySelector(`template[data-for="${t.dataset.tip}"]`);
      if (tpl) OI.tip(t, tpl.dataset.title || '', tpl.innerHTML);
      return;
    }
    if (pop && !e.target.closest('.tip')) close();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  // Fold rows on phones (family list): a click on a [data-fold] header toggles its section.
  document.addEventListener('click', (e) => {
    const h = e.target.closest('[data-fold]'); if (!h) return;
    h.closest('.rfold').classList.toggle('shut');
  });
  // "Show all" in a long mini list.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-showall]'); if (!b) return;
    b.closest('[data-more-scope]').classList.add('all'); b.remove();
  });
})();
