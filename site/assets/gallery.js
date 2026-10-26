// Project page: click a screenshot to see it full size; Escape, a click or the close button returns.
(function () {
  let viewer = null;
  const close = () => { if (viewer) { viewer.remove(); viewer = null; } };
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-shot]');
    if (t) {
      viewer = document.createElement('div');
      viewer.className = 'viewer'; viewer.setAttribute('role', 'dialog'); viewer.setAttribute('aria-label', 'Screenshot, full size');
      viewer.innerHTML = '<button class="btn md secondary close" type="button">Close</button><img alt="" referrerpolicy="no-referrer">';
      viewer.querySelector('img').src = t.dataset.shot;
      document.body.appendChild(viewer); viewer.querySelector('.close').focus();
      return;
    }
    if (viewer && (e.target === viewer || e.target.closest('.close'))) close();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
})();
