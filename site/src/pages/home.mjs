// The home page: hero with search, the biggest gaps, a hand-picked row, and every category.
// WHY no vote numbers: this is the real site and nobody has voted yet; gaps are described from the data itself.
import { url, esc, ICON, API_URL, factChips, statusPill } from '../lib.mjs';

// WHY these first: everyday apps are why most visitors arrive; developer and business tools come after.
const LATER = new Set(['dev', 'business']);
const POPULAR = ['Google Docs', 'Notion', 'Adobe Photoshop', 'Slack', 'Figma', 'Spotify', 'Zoom', 'Microsoft Windows'];

export default function home(d) {
  const catOrder = (g) => (LATER.has(g.category) ? 1 : 0) * 100 + d.categories.findIndex((c) => c.id === g.category);
  const fullCount = (g) => g.alternatives.filter((a) => a.fit === 'full').length;
  const listings = d.groups.reduce((s, g) => s + g.alternatives.length, 0);
  const closedCount = new Set(d.groups.flatMap((g) => g.closed)).size;

  // Biggest gaps: groups where nothing open does the whole job; empty groups first.
  const gaps = d.groups.filter((g) => fullCount(g) === 0)
    .sort((a, b) => a.alternatives.length - b.alternatives.length || catOrder(a) - catOrder(b)).slice(0, 8);
  const gapLine = (g) => g.alternatives.length === 0 ? 'No open alternative yet'
    : `${g.alternatives.length} ${g.alternatives.length === 1 ? 'does' : 'do'} part of the job`;
  const gapCard = (g) => `<a class="card gcard" href="${url(`g/${g.id}/`)}">
      <div class="head"><h3>${esc(g.name)}</h3><div class="corner" style="margin-right:0"><span class="pill warn"><i></i>${esc(gapLine(g))}</span></div></div>
      <p class="job">${esc(g.job)}.</p>
      <div class="foot">Replaces ${esc(g.closed.join(', '))}</div></a>`;

  // Hand-picked: one well-known, active project per everyday category, taken from the starter set.
  const picks = [];
  for (const c of d.categories.filter((c) => !LATER.has(c.id))) {
    for (const g of d.groups.filter((g) => g.category === c.id)) {
      const a = g.alternatives.find((a) => { const p = d.projById.get(a.project); return a.fit === 'full' && p.source === 'starter' && !p.inactive && p.licenseClass === 'open' && !picks.some((x) => x.p.id === p.id); });
      if (a) { picks.push({ g, a, p: d.projById.get(a.project) }); break; }
    }
    // WHY eight: rows of four on wide screens and two on narrow ones, so no card is left alone on a line.
    if (picks.length === 8) break;
  }
  const pickCard = ({ g, a, p }) => `<a class="card" href="${url(`p/${p.id}/`)}">
      <div class="head"><h3>${esc(p.name)}</h3><div class="corner" style="margin-right:0">${statusPill(p)}</div></div>
      <div class="chiprow"><span class="chip">${esc(g.name)}</span>${factChips(p, a)}</div>
      <p class="blurb">${esc(p.summary)}</p></a>`;

  const popular = POPULAR.map((name) => { const g = d.groups.find((g) => g.closed.includes(name)); return g ? `<a class="fchip" href="${url(`g/${g.id}/?compare=${encodeURIComponent(name)}`)}">${esc(name)}</a>` : ''; }).join('');

  const cats = d.categories.map((c) => {
    const gs = d.groups.filter((g) => g.category === c.id);
    const n = gs.reduce((s, g) => s + g.alternatives.length, 0);
    return `<div class="card catcard">
        <div class="head"><h3><a href="${url(`c/${c.id}/`)}">${esc(c.name)}</a></h3><span class="chip"><b>${gs.length}</b>${gs.length === 1 ? 'group' : 'groups'} · <b>${n}</b>listings</span></div>
        <div class="gchips">${gs.map((g) => `<a class="fchip" href="${url(`g/${g.id}/`)}">${esc(g.name)}<span class="n">${g.alternatives.length}</span></a>`).join('')}</div>
      </div>`;
  }).join('');

  const body = `
  <!-- Hero card: headline, search and popular picks in one card (no bare text on the wallpaper). -->
  <div class="surface hero2">
    <div class="hero-row">
      <a class="avatar brand" href="${url()}" aria-label="Open Instead home">${ICON.home}</a>
      <div class="headline">
        <h1>Open-source replacements for the apps you use</h1>
        <p class="desc12">Made with the r/TrueOpenSource community. Shows where nothing good exists yet, too.</p>
      </div>
      <div class="searchwrap" data-search>
        <div class="searchpill">${ICON.search}<input type="search" placeholder="Search a closed app, like Google Docs…" autocomplete="off" aria-label="Search"></div>
        <div class="menu search-menu" role="listbox"></div>
      </div>
    </div>
    <div class="pop"><span class="muted11">Popular</span><div class="fchips">${popular}</div></div>
    <div class="chiprow stats"><span class="chip"><b>${d.groups.length}</b>groups</span><span class="chip"><b>${closedCount}</b>closed apps</span><span class="chip"><b>${d.projects.length}</b>open-source projects</span><span class="chip"><b>${listings}</b>listings</span></div>
  </div>

  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">Biggest gaps</h2><p class="desc12">Where nothing open does the whole job yet. A good place to start building.</p></div></div>
    <div class="row1 fill">${gaps.map(gapCard).join('')}</div>
  </section>

  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">Hand-picked</h2><p class="desc12">Well-known open-source apps that do the whole job, one from each everyday category</p></div></div>
    <div class="row1 fill">${picks.map(pickCard).join('')}</div>
  </section>

  <div class="surface builders">
    <div style="min-width:0;max-width:640px">
      <h2 class="h-large">Building an open alternative?</h2>
      <p class="small2" style="margin-top:4px">See what already exists, reuse parts of it, or get your project listed so people can find it. The whole map is free to download, for people and AI assistants.</p>
    </div>
    <div class="btns">
      <a class="btn md secondary" href="${url('data/groups.json')}" download>Download the whole map</a>
      ${API_URL ? `<a class="btn md primary" href="${url('g/documents/#add')}">Add your project</a>` : `<a class="btn md primary" href="${url('about/#add')}">How to get listed</a>`}
    </div>
  </div>

  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">Browse by category<span class="count">${d.categories.length}</span></h2><p class="desc12">${d.groups.length} groups, ${listings} listings. Pick the job you need done.</p></div></div>
    <div class="cats">${cats}</div>
  </section>`;

  return [{
    path: '', title: '', search: false, styles: ['pages.css'],
    description: `Open-source replacements for ${closedCount} closed apps, grouped by the job they do, with where nothing good exists yet. Made with r/TrueOpenSource.`,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Open Instead', url: 'https://itsdestin.github.io/openinstead/' },
    body,
  }];
}
