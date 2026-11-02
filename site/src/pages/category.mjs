// One page per category (c/<id>/): every group in it, as raised cards.
import { url, esc, SOCIAL } from '../lib.mjs';
import { mapTrail } from '../redesign.mjs';
import { catIcon } from '../icons.mjs';

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
    // WHY "Related categories" lists only this area's (taxonomy-v2, Oct 27): 26 across six areas was a wall; the neighbours
    // in the same area are the useful jumps, and the trail's area link reaches the rest.
    // WHY a card of cards at the bottom (Destin, Nov 2): it replaces the chip row in the old top card, so the subcategories
    // come first; each looks like a subcategory card (name, two lines naming what's inside, counts) so the page reads as one set.
    const area = d.areaOf.get(c.id);
    const others = (area?.categories ?? []).filter((id) => id !== c.id && d.groups.some((g) => g.category === id)).map((id) => d.catById.get(id)).filter(Boolean)
      .map((x) => {
        const xs = d.groups.filter((g) => g.category === x.id).sort((p, q) => q.alternatives.length - p.alternatives.length);
        const projects = new Set(xs.flatMap((g) => g.alternatives.map((a) => a.project))).size;
        return `<a class="card gcard grpcard" href="${url(`c/${x.id}/`)}">
        <h3>${esc(x.name)}</h3>
        <p class="job">${esc(xs.map((g) => g.name).join(', '))}</p>
        <div class="chiprow"><span class="chip">${xs.length} ${xs.length === 1 ? 'subcategory' : 'subcategories'}</span><span class="chip">${projects} open projects</span></div></a>`;
      }).join('');
    return {
      path: `c/${c.id}/`, title: c.name, styles: ['pages.css'],
      description: `Open-source alternatives in ${c.name}: ${gs.map((g) => g.name).join(', ')}.`,
      // WHY the subcategories are the top card (Destin, Nov 2: "groups should change to 'Office & productivity - Subcategories'
      // and become the top card"): the separate title card only held the name and the chips, now in the heading and the bottom card.
      body: `
  ${mapTrail(d, { category: c.id }, c.name)}
  <section class="surface sec">
    <!-- WHY the big name with its icon (Destin, Nov 2: "keep the old header text size/improve this a bit visually"): the category's
         name keeps the old title size and the home page's icon; "Subcategories" and the count are quieter beside it. -->
    <div class="sec-head cattitle"><span class="caticon">${catIcon(c.id, area?.id)}</span><h1 class="h-subject">${esc(c.name)}<span class="sub"><span class="dash"> – </span>Subcategories<span class="count">${gs.length}</span></span></h1></div>
    <div class="gaplist grplist">${gs.map(card).join('')}</div>
  </section>
  ${others ? `<section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">Related categories</h2></div></div>
    <div class="gaplist grplist">${others}</div>
  </section>` : ''}`,
    };
  })];
}
