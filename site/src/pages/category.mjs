// One page per category (c/<id>/): every group in it, as raised cards.
import { url, esc, SOCIAL } from '../lib.mjs';
import { mapTrail, areaLabel } from '../redesign.mjs';

export default function categories(d) {
  // WHY skip empty categories (taxonomy-v2): a new category whose groups all wait for checked projects would be a blank page.
  // WHY forwarders (Destin, hierarchy deck, Oct 30): three small categories were folded into a neighbour; their old addresses
  // may be shared, so each sends visitors on to the category that absorbed it (same pattern as boards.mjs).
  const forwards = Object.entries(d.mergedCategories ?? {}).filter(([, to]) => d.catById.has(to)).map(([from, to]) => {
    const target = url(`c/${to}/`);
    return { path: `c/${from}/`, title: d.catById.get(to).name, noIndex: true, description: `Moved to ${d.catById.get(to).name}.`,
      body: `<section class="surface sec"><p class="body2">This is now part of <a href="${target}">${esc(d.catById.get(to).name)}</a>…</p><script>location.replace(${JSON.stringify(target)});</script></section>` };
  });
  return [...forwards, ...d.categories.filter((c) => d.groups.some((g) => g.category === c.id)).map((c) => {
    const gs = d.groups.filter((g) => g.category === c.id);
    const n = gs.reduce((s, g) => s + g.alternatives.length, 0);
    const card = (g) => {
      const full = g.alternatives.filter((a) => a.fit === 'full').length;
      // WHY this order and no status pill (Destin, Nov 2): name, then a two-line description of the job right under it, then
      // the count and what it replaces as two chips at the bottom (Destin: "replaces should become a chip alongside"), so every
      // card is built the same way and the cards line up.
      // The "Only partial replacements" pill is gone from this view; the Gaps page still lists those groups.
      return `<a class="card gcard grpcard" href="${url(`g/${g.id}/`)}">
        <h3>${esc(g.name)}</h3>
        <p class="job">${esc(g.job)}</p>
        <div class="chiprow"><span class="chip">${g.alternatives.length} ${g.alternatives.length === 1 ? 'alternative' : 'alternatives'}${full ? ` · ${full} full` : ''}</span>${g.closed.length ? `<span class="chip replaces" title="Replaces ${esc(g.closed.join(', '))}">Replaces ${esc(g.closed.join(', '))}</span>` : ''}</div></a>`;
    };
    // WHY "Other categories" lists only this area's (taxonomy-v2, Oct 27): 26 chips across six areas was a wall; the neighbours
    // in the same area are the useful jumps, and the crumb's area link reaches the rest.
    const area = d.areaOf.get(c.id);
    const others = (area?.categories ?? []).filter((id) => id !== c.id && d.groups.some((g) => g.category === id)).map((id) => d.catById.get(id)).filter(Boolean)
      .map((x) => `<a class="fchip" href="${url(`c/${x.id}/`)}">${esc(x.name)}</a>`).join('');
    return {
      path: `c/${c.id}/`, title: c.name, styles: ['pages.css'],
      description: `Open-source alternatives in ${c.name}: ${gs.map((g) => g.name).join(', ')}.`,
      body: `
  ${mapTrail(d, { category: c.id }, c.name)}
  <div class="surface identity">
    <div><h1 class="h-subject">${esc(c.name)}</h1></div>
    ${others ? `<div class="pop" style="padding-left:0"><span class="muted11">Also in ${esc(areaLabel(area))}</span><div class="fchips">${others}</div></div>` : ''}
  </div>
  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">Groups<span class="count">${gs.length}</span></h2></div></div>
    <div class="gaplist grplist">${gs.map(card).join('')}</div>
  </section>`,
    };
  })];
}
