// One page per category (c/<id>/): every group in it, as raised cards.
import { url, esc, SOCIAL } from '../lib.mjs';

export default function categories(d) {
  return d.categories.map((c) => {
    const gs = d.groups.filter((g) => g.category === c.id);
    const n = gs.reduce((s, g) => s + g.alternatives.length, 0);
    const card = (g) => {
      const full = g.alternatives.filter((a) => a.fit === 'full').length;
      // WHY a status pill only for gaps: "nothing does the whole job" is the fact worth flagging; the rest is a count.
      const pill = g.alternatives.length === 0 ? '<span class="pill warn"><i></i>No open alternative yet</span>'
        : full === 0 ? '<span class="pill warn"><i></i>Only partial replacements</span>' : '';
      return `<a class="card gcard" href="${url(`g/${g.id}/`)}">
        <div class="head"><h3>${esc(g.name)}</h3>${pill ? `<div class="corner" style="margin-right:0">${pill}</div>` : ''}</div>
        <div class="chiprow"><span class="chip">${g.alternatives.length} ${g.alternatives.length === 1 ? 'alternative' : 'alternatives'}${full ? ` · ${full} full` : ''}</span></div>
        <div class="foot">Replaces ${esc(g.closed.join(', '))}</div></a>`;
    };
    const others = d.categories.filter((x) => x.id !== c.id).map((x) => `<a class="fchip" href="${url(`c/${x.id}/`)}">${esc(x.name)}</a>`).join('');
    return {
      path: `c/${c.id}/`, title: c.name, styles: ['pages.css'],
      description: `Open-source alternatives in ${c.name}: ${gs.map((g) => g.name).join(', ')}.`,
      body: `
  <div class="surface identity">
    <div><div class="muted11">Category</div><h1 class="h-subject">${esc(c.name)}</h1></div>
    <div class="pop" style="padding-left:0"><span class="muted11">Other categories</span><div class="fchips">${others}</div></div>
  </div>
  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">Groups<span class="count">${gs.length}</span></h2></div></div>
    <div class="row1 fill list">${gs.map(card).join('')}</div>
  </section>`,
    };
  });
}
