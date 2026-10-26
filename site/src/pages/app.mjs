// One page per closed app (alternatives-to/<app>/): "Open-source alternatives to Notion".
// WHY (Destin, Oct 27): people search by the app they want to leave, not by our group names. Each page shows the
// alternatives from every group that replaces the app (Photoshop sits in both Photo editing and Painting).
import { esc, url, SITE_URL } from '../lib.mjs';
import { altCard, appSlug, appUrl, sortAlts, deviceFilter } from '../cards.mjs';

export default function appPages(d) {
  // WHY keyed by address, not spelling: the imported lists spell some apps two ways ("Datadog", "DataDog");
  // both are one app and share one page, named by the first spelling seen.
  const apps = new Map();
  for (const g of d.groups) for (const c of g.closed) {
    const e = apps.get(appSlug(c)) ?? apps.set(appSlug(c), { name: c, groups: [] }).get(appSlug(c));
    if (!e.groups.includes(g)) e.groups.push(g);
  }

  return [...apps.values()].map(({ name, groups }) => {
    const sections = groups.map((g) => ({ g, alts: sortAlts(g.alternatives.map((a) => ({ a, p: d.projById.get(a.project) })).filter((x) => x.p)) }));
    const all = [...new Map(sections.flatMap((s) => s.alts).map((x) => [x.p.id, x])).values()];
    const full = new Set(all.filter((x) => x.a.fit === 'full').map((x) => x.p.id)).size;
    const others = [...new Map(groups.flatMap((g) => g.closed).map((c) => [appSlug(c), c])).entries()].filter(([s]) => s !== appSlug(name)).map(([, c]) => c);
    let i = 0;

    const section = ({ g, alts }) => `
  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">${groups.length > 1 ? esc(g.name) : 'Open alternatives'}<span class="count">${alts.length}</span></h2>
      <p class="desc12">${esc(g.job)}. <a class="crumb" href="${url(`g/${g.id}/`)}">See the whole group</a></p></div></div>
    ${alts.length
      ? `<div class="grid" data-alts>${alts.map((x) => altCard(x.p, x.a, i++, g)).join('')}</div><div class="callout info" data-nomatch hidden>None of these match. Try another device.</div>`
      : `<div class="callout info">Nothing open does this yet. It's one of the <a href="${url('gaps/')}">gaps on the map</a>: if you're building one, <a href="${url(`g/${g.id}/#build`)}">see what to reuse first</a>.</div>`}
  </section>`;

    const body = `
  <div class="surface identity">
    <div class="row"><div><div class="muted11">Closed app</div><h1 class="h-subject">Open-source alternatives to ${esc(name)}</h1>
      <p class="desc12" style="margin-top:4px">${all.length
        ? `${all.length} open-source ${all.length === 1 ? 'project' : 'projects'} that replace ${esc(name)}${full ? `, ${full === all.length ? 'all' : full} of them for the whole job` : ', each for part of the job'}.`
        : `No open-source app replaces ${esc(name)} yet.`}</p></div>${all.length > 1 ? deviceFilter('devMenu') : ''}</div>
    ${others.length ? `<div class="replaces-row"><span class="muted11">Also replaces</span><div class="chiprow">${others.map((c) => `<a class="chip" href="${appUrl(c)}">${esc(c)}</a>`).join('')}</div></div>` : ''}
  </div>
  ${sections.map(section).join('')}`;

    const description = all.length
      ? `${all.length} open-source alternative${all.length === 1 ? '' : 's'} to ${name}: ${all.slice(0, 4).map((x) => x.p.name).join(', ')}${all.length > 4 ? ' and more' : ''}.`
      : `No open-source app replaces ${name} yet. See what's missing, or build one.`;
    return {
      path: `alternatives-to/${appSlug(name)}/`, title: `Open-source alternatives to ${name}`, description, body,
      styles: ['group.css'], scripts: ['group.js'],
      jsonLd: { '@context': 'https://schema.org', '@type': 'ItemList', name: `Open-source alternatives to ${name}`,
        itemListElement: all.map(({ p }, k) => ({ '@type': 'ListItem', position: k + 1, item: { '@type': 'SoftwareApplication', name: p.name, url: `${SITE_URL}p/${p.id}/` } })) },
    };
  });
}
