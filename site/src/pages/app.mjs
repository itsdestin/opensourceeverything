// One page per closed app (alternatives-to/<app>/): "Open-source alternatives to Notion".
// WHY (Destin, Oct 27): people search by the app they want to leave, not by our group names. Each page shows the
// alternatives from every group that replaces the app (Photoshop sits in both Photo editing and Painting).
import { esc, url, SITE_URL, SOCIAL } from '../lib.mjs';
import { altCard, appSlug, appUrl, sortAlts, deviceFilter, buildBox, chooseBox } from '../cards.mjs';
import { switchGuide, groupCompare, closedStatus, srcHost } from '../surfaces.mjs';
import { mapTrail } from '../redesign.mjs';

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
    <div class="sec-head"><div><h2 class="h-large">${groups.length > 1 ? esc(g.name) : 'Open alternatives'}${alts.length > 1 ? `<span class="count">${alts.length}</span>` : ''}</h2></div><a class="btn sm secondary" href="${url(`g/${g.id}/`)}">See the whole group</a></div>
    ${alts.length
      ? `<div class="grid" data-alts>${alts.map((x) => altCard(x.p, x.a, i++, g, x.why)).join('')}</div><div class="callout info" data-nomatch hidden>None of these match. Try another device.</div>`
      : `<div class="callout info">Nothing open does this yet. It's one of the <a href="${url('gaps/')}">gaps on the map</a>: if you're building one, <a href="${url(`g/${g.id}/#build`)}">see what to reuse first</a>.</div>`}
  </section>`;

    // WHY a compare table per group here (evidence map §1, Nov 2): "how does each alternative compare with the app I'm leaving?"
    // is this page's question. Only this app's row sits above the alternatives; the group page shows every closed app.
    const compare = ({ g, alts }) => { const t = groupCompare(g, alts, [name]).replace('data-compare hidden', 'data-compare'); return t ? `
  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">How they compare with ${esc(name)}${groups.length > 1 ? `<span class="sub"><span class="dash"> – </span>${esc(g.name)}</span>` : ''}</h2></div></div>
    ${t}
  </section>` : ''; };
    // WHY a status line (cleanup §6, Destin Nov 2): shut-down apps stay listed, because people look for alternatives exactly then.
    const st = closedStatus(name);
    const gone = st ? `<p class="gone-line"><span class="pill">${st.is === 'renamed' ? 'Renamed' : 'Discontinued'}</span>${st.note ? `<span>${esc(st.note)}</span>` : ''}${st.source ? `<a class="fx-src" href="${esc(st.source)}" rel="noopener">${esc(srcHost(st.source))}</a>` : ''}</p>` : '';
    // WHY a trail here too (Nov 2): closed-app pages were the only deep pages with no way up a level.
    const body = `
  ${mapTrail(d, { group: groups[0] }, name)}
  <div class="surface identity">
    <div class="row"><div><h1 class="h-subject">Open-source alternatives to ${esc(name)}</h1>
      ${all.length ? '' : `<p class="desc12" style="margin-top:4px">No open-source app replaces ${esc(name)} yet.</p>`}${gone}</div>${all.length > 1 ? deviceFilter('devMenu') : ''}</div>
    ${others.length ? `<div class="replaces-row"><span class="muted11">Also replaces</span><div class="chiprow">${others.map((c) => `<a class="chip" href="${appUrl(c)}">${esc(c)}</a>`).join('')}</div></div>` : ''}
  </div>
  ${sections.map(section).join('')}
  ${sections.map(compare).join('')}
  ${switchGuide(appSlug(name), name, d)}
  ${all.length > 1 ? chooseBox({ closed: [name], json: `data/groups/${groups[0].id}.json`, alts: all }) : ''}
  ${SOCIAL && !all.some((x) => x.a.fit === 'full') ? `<!-- WHY: only when nothing open fully replaces it; the server checks the same rule -->
  <section class="surface sec"><div class="sec-head"><div><h2 class="h-large">Want an open ${esc(name)}?</h2></div><div class="want" data-request data-key="app:${esc(name)}" hidden></div></div></section>` : ''}
  ${buildBox({ about: `an alternative to ${name}`, closed: [name], json: `data/groups/${groups[0].id}.json`, alts: all })}`;

    const description = all.length
      ? `${all.length} open-source alternative${all.length === 1 ? '' : 's'} to ${name}: ${all.slice(0, 4).map((x) => x.p.name).join(', ')}${all.length > 4 ? ' and more' : ''}.`
      : `No open-source app replaces ${name} yet. See what's missing, or build one.`;
    return {
      path: `alternatives-to/${appSlug(name)}/`, title: `Open-source alternatives to ${name}`, description, body,
      styles: ['group.css', 'surfaces.css'], scripts: ['group.js', 'surfaces.js'],
      jsonLd: { '@context': 'https://schema.org', '@type': 'ItemList', name: `Open-source alternatives to ${name}`,
        itemListElement: all.map(({ p }, k) => ({ '@type': 'ListItem', position: k + 1, item: { '@type': 'SoftwareApplication', name: p.name, url: `${SITE_URL}p/${p.id}/` } })) },
    };
  });
}
