// The home page, in the order a newcomer needs it (Destin, Oct 27: "clearer… more polished for newcomers"):
// 1. what this is and a big search, 2. popular switches with real screenshots, 3. every category as a tidy card,
// 4. what's still missing, 5. the builders' card. Everything sits inside a raised card (no bare text).
import { url, esc, ICON, suggestUrl, shot, SITE_URL, SOCIAL, counts } from '../lib.mjs';
import { appUrl, sortAlts } from '../cards.mjs';

// WHY two lists: the picture cards need a replacement with a real screenshot, while the "Try" chips can name any
// app people search for.
const POPULAR = ['Google Docs', 'Adobe Photoshop', 'Microsoft Windows', 'Google Chrome', 'Notion', 'Google Photos', 'Figma', 'WhatsApp'];
// WHY by hand: the obvious answer isn't always the most-starred one (GIMP has no GitHub stars; it lives on GNOME's own server).
const LEAD = { 'Adobe Photoshop': 'gimp' };
const TRY = ['Google Docs', 'Microsoft Windows', 'Google Chrome', 'Adobe Photoshop', 'Spotify', 'Slack'];
// WHY everyday first (Destin picked "Everyday first, areas below" in the taxonomy-v2 deck, Oct 27): most visitors come to replace a
// paid app, so the everyday area's categories lead; the other five areas follow as one card each.
const EVERYDAY = 'everyday';
// WHY icons: a category reads at a glance, like the app's Marketplace sections. Lucide-style strokes, as in YouCoded.
const svg = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CAT_ICON = {
  office: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  social: svg('<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.6A8 8 0 1 1 21 12z"/>'),
  creative: svg('<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2A5.6 5.6 0 0 0 22 11c0-5-4.5-9-10-9z"/>'),
  os: svg('<rect x="2" y="4" width="14" height="10" rx="2"/><path d="M6 18h6M9 14v4"/><rect x="17" y="8" width="5" height="12" rx="1.5"/>'),
  web: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  ai: svg('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  media: svg('<rect x="2" y="5" width="20" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>'),
  files: svg('<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.5 12 3.5 3.5 0 0 0 6.5 19z"/>'),
  everyday: svg('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  dev: svg('<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>'),
  business: svg('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>'),
  games: svg('<rect x="2" y="7" width="20" height="11" rx="4"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r="1"/><circle cx="18" cy="13.5" r="1"/>'),
};
// One icon per area, used by any category in it that has no icon of its own (same Lucide-style strokes).
const AREA_ICON = {
  'ai-area': CAT_ICON.ai,
  'os-area': CAT_ICON.os,
  hardware: svg('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/>'),
  developer: CAT_ICON.dev,
  system: svg('<rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><path d="M6 6.5h.01M6 17.5h.01"/>'),
};

export default function home(d) {
  const catOrder = (g) => (d.areaOf.get(g.category)?.id === EVERYDAY ? 0 : 100) + d.categories.findIndex((c) => c.id === g.category);
  const fullCount = (g) => g.alternatives.filter((a) => a.fit === 'full').length;
  // WHY lib's counts(): the same numbers as About and the page descriptions (see lib.mjs).
  const { projects: projectCount, closedApps: closedCount, groups: jobCount } = counts(d);
  const altsFor = (name) => sortAlts([...new Map(d.groups.filter((g) => g.closed.includes(name))
    .flatMap((g) => g.alternatives.map((a) => ({ a, p: d.projById.get(a.project) }))).filter((x) => x.p).map((x) => [x.p.id, x])).values()]);

  // ── Popular alternatives: the best-known replacement with a screenshot leads each card ──
  const switches = POPULAR.map((name) => {
    const alts = altsFor(name);
    // WHY a Verified pick first (Oct 27): the card's one name should be the one mods vouch for, e.g. Linux Mint for Windows.
    const withShot = (x) => x.p.screenshots?.length;
    const lead = alts.find((x) => x.p.id === LEAD[name]) ?? alts.find((x) => x.p.verified && x.a.fit === 'full' && withShot(x)) ?? alts.find((x) => x.a.fit === 'full' && withShot(x)) ?? alts.find(withShot) ?? alts[0];
    return lead ? { name, lead, more: alts.length - 1 } : null;
  }).filter(Boolean);
  const switchCard = ({ name, lead, more }) => `<a class="card pic swcard" href="${appUrl(name)}">
      ${lead.p.screenshots?.[0] ? `<div class="preview"><img src="${esc(shot(lead.p))}" alt="${esc(lead.p.name)} screenshot" loading="lazy" referrerpolicy="no-referrer"></div>` : '<div class="preview empty">No screenshot yet</div>'}
      <div class="inner">
        <div class="muted11">Instead of ${esc(name)}</div>
        <h3>${esc(lead.p.name)}</h3>
        ${more > 0 ? `<div class="foot"><span class="chip">+${more} more</span></div>` : ''}
      </div></a>`;

  // ── Hero collage: three real screenshots, slightly fanned, so the first thing a visitor sees is real software ──
  // WHY these three: wide desktop screenshots fan out cleanly; tall phone shots (AppFlowy's) looked cluttered there.
  const collage = ['Figma', 'Adobe Photoshop', 'Google Docs'].map((n) => switches.find((s) => s.name === n)?.lead.p).filter(Boolean).map((p) => shot(p)).filter(Boolean);

  // ── Categories: icon, name, a summary line and its first groups; the rest is one "+ more" chip ──
  const SHOWN = 6;
  const numbers = (gs) => { const n = new Set(gs.flatMap((g) => g.alternatives.map((a) => a.project))).size;
    return `<b class="num">${gs.length}</b> ${gs.length === 1 ? 'job' : 'jobs'} · <b class="num">${n}</b> open projects`; };
  const everyday = d.areas.find((a) => a.id === EVERYDAY) ?? d.areas[0];
  // WHY skip empty categories: a category whose groups are all still waiting for checked projects has nothing to open.
  const catsIn = (a) => a.categories.map((id) => d.catById.get(id)).filter((c) => c && d.groups.some((g) => g.category === c.id));
  // WHY each category card gets its area's icon when it has none of its own: the 18 non-everyday categories had no icons.
  const catCard = (c, a) => {
    const gs = d.groups.filter((g) => g.category === c.id).sort((x, y) => y.alternatives.length - x.alternatives.length);
    return `<div class="card catcard2">
        <a class="cardlink" href="${url(`c/${c.id}/`)}" aria-label="${esc(c.name)}"></a>
        <div class="cathead"><span class="caticon">${CAT_ICON[c.id] ?? AREA_ICON[a.id] ?? ''}</span><div><h3>${esc(c.name)}</h3><div class="desc12">${numbers(gs)}</div></div></div>
        <div class="gchips">${gs.slice(0, SHOWN).map((g) => `<a class="fchip" href="${url(`g/${g.id}/`)}">${esc(g.name)}</a>`).join('')}${gs.length > SHOWN ? `<a class="fchip more" href="${url(`c/${c.id}/`)}">+ ${gs.length - SHOWN} more</a>` : ''}</div>
      </div>`;
  };
  // ── Browse: ONE card; each area is a labelled row of category cards, everyday first ──
  // WHY (Destin, Oct 28: "confused about the hierarchy… clutter"): area cards and category cards looked the same but behaved
  // differently (areas have no page). Now areas are only headings, so every card is a category and every card opens one.
  // The ids let a category page's breadcrumb jump back to its area's row.
  const areaRows = [everyday, ...d.areas.filter((a) => a !== everyday)].map((a) => ({ a, cs: catsIn(a) })).filter(({ cs }) => cs.length)
    // WHY <details> (Destin, hierarchy deck, Oct 30: "all collapsible sections", "on mobile especially"): every area row folds, with
    // the browser's own keyboard and screen-reader support. WHY only Everyday apps starts open, on every screen (Destin, Oct 30): written
    // into the page, so nothing flashes open then shut. site.js opens a row a link points at (#area-…, the category breadcrumb).
    .map(({ a, cs }) => `<details class="arearow" id="area-${a.id}"${a === everyday ? ' open' : ''}>
      <summary><span class="label">${esc(a === everyday ? 'Everyday apps' : a.name)}</span><span class="muted11">${cs.length} ${cs.length === 1 ? 'category' : 'categories'}</span></summary>
      <div class="catgrid">${cs.map((c) => catCard(c, a)).join('')}</div>
    </details>`).join('');

  // ── Still missing: the four worst gaps, everyday first ──
  const gaps = d.groups.filter((g) => fullCount(g) === 0)
    .sort((a, b) => a.alternatives.length - b.alternatives.length || catOrder(a) - catOrder(b)).slice(0, 4);
  const gapTotal = d.groups.filter((g) => fullCount(g) === 0).length;
  const gapCard = (g) => `<a class="card gcard" href="${url(`g/${g.id}/`)}">
      <div class="head"><h3>${esc(g.name)}</h3></div>
      <div class="chiprow"><span class="pill warn"><i></i>${g.alternatives.length === 0 ? 'Nothing open yet' : 'Only partial replacements'}</span></div>
      <div class="foot">Replaces ${esc(g.closed.join(', '))}</div></a>`;

  const body = `
  <div class="surface hero3">
    ${SOCIAL ? '<div class="hero-acct" data-account></div>' : ''}
    <div class="hero-text">
      <h1>Find an open-source replacement for the apps you use</h1>
      <div class="searchwrap big" data-search>
        <div class="searchpill">${ICON.search}<input type="search" placeholder="Which app do you want to replace?" autocomplete="off" aria-label="Search for an app"></div>
        <div class="menu search-menu" role="listbox"></div>
      </div>
      <div class="pop"><span class="muted11">Try</span><div class="fchips">${TRY.map((n) => `<a class="fchip" href="${appUrl(n)}">${esc(n)}</a>`).join('')}</div></div>
    </div>
    ${collage.length === 3 ? `<div class="collage" aria-hidden="true">${collage.map((u, i) => `<img class="c${i}" src="${esc(u)}" alt="" referrerpolicy="no-referrer">`).join('')}</div>` : ''}
  </div>

  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">Popular alternatives</h2></div></div>
    <div class="swgrid">${switches.map(switchCard).join('')}</div>
  </section>

  <section class="surface sec" id="categories">
    <div class="sec-head"><div><h2 class="h-large">Browse by category</h2></div></div>
    <!-- WHY one card (Destin, structure deck: "just keep them all on one big card"), split into area rows (Oct 28). -->
    ${areaRows}
  </section>

  ${SOCIAL ? `<!-- WHY here (review Oct 26): people's asks, ranked, are the clearest "what next"; filled in by assets/contrib.js -->
  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">Most requested</h2></div><a class="btn sm secondary" href="${url('gaps/#requested')}">See all</a></div>
    <div data-most-requested data-limit="5" data-layout="five"></div>
  </section>` : ''}

  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">Still missing</h2></div><a class="btn sm secondary" href="${url('gaps/')}">See all gaps</a></div>
    <div class="gapgrid">${gaps.map(gapCard).join('')}</div>
  </section>

  <div class="surface builders">
    <div style="min-width:0;max-width:640px">
      <h2 class="h-large">Building an open alternative?</h2>
    </div>
    <div class="btns">
      <a class="btn md secondary" href="${esc(suggestUrl('4-new-group'))}" rel="noopener">Suggest a missing job</a>
      <a class="btn md primary" href="${esc(suggestUrl('1-add-project'))}" rel="noopener">Add your project</a>
    </div>
  </div>`;

  return [{
    path: '', title: '', styles: ['pages.css', 'group.css'],
    description: `${projectCount} open-source projects that replace ${closedCount} closed apps, grouped by the ${jobCount} jobs they do, with where nothing good exists yet. Supported by r/TrueOpenSource.`,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Open Source Everything', url: SITE_URL },
    body,
  }];
}
