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
// WHY these last: everyday apps are why most visitors arrive; developer and business tools come after.
const LATER = new Set(['dev', 'business']);
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
};

export default function home(d) {
  const catOrder = (g) => (LATER.has(g.category) ? 100 : 0) + d.categories.findIndex((c) => c.id === g.category);
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
        <div class="foot">${more > 0 ? `+${more} more` : 'the open alternative'}</div>
      </div></a>`;

  // ── Hero collage: three real screenshots, slightly fanned, so the first thing a visitor sees is real software ──
  // WHY these three: wide desktop screenshots fan out cleanly; tall phone shots (AppFlowy's) looked cluttered there.
  const collage = ['Figma', 'Adobe Photoshop', 'Google Docs'].map((n) => switches.find((s) => s.name === n)?.lead.p).filter(Boolean).map((p) => shot(p)).filter(Boolean);

  // ── Categories: icon, name, a summary line and its first groups; the rest is one "+ more" chip ──
  const SHOWN = 6;
  const cats = [...d.categories].sort((a, b) => (LATER.has(a.id) ? 1 : 0) - (LATER.has(b.id) ? 1 : 0)).map((c) => {
    const gs = d.groups.filter((g) => g.category === c.id).sort((a, b) => b.alternatives.length - a.alternatives.length);
    const n = new Set(gs.flatMap((g) => g.alternatives.map((a) => a.project))).size;
    return `<div class="card catcard2">
        <a class="cardlink" href="${url(`c/${c.id}/`)}" aria-label="${esc(c.name)}"></a>
        <div class="cathead"><span class="caticon">${CAT_ICON[c.id] ?? ''}</span><div><h3>${esc(c.name)}</h3><div class="desc12"><b class="num">${gs.length}</b> ${gs.length === 1 ? 'job' : 'jobs'} · <b class="num">${n}</b> open projects</div></div></div>
        <div class="gchips">${gs.slice(0, SHOWN).map((g) => `<a class="fchip" href="${url(`g/${g.id}/`)}">${esc(g.name)}</a>`).join('')}${gs.length > SHOWN ? `<a class="fchip more" href="${url(`c/${c.id}/`)}">+ ${gs.length - SHOWN} more</a>` : ''}</div>
      </div>`;
  }).join('');

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
    <div class="sec-head"><div><h2 class="h-large">Popular switches</h2></div></div>
    <div class="swgrid">${switches.map(switchCard).join('')}</div>
  </section>

  <section class="surface sec" id="categories">
    <div class="sec-head"><div><h2 class="h-large">Browse by category</h2></div></div>
    <div class="catgrid">${cats}</div>
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
