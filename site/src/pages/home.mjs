// The home page, in the order a newcomer needs it (Destin, Oct 27: "clearer… more polished for newcomers"):
// 1. what this is and a big search, 2. popular switches with real screenshots, 3. every category as a tidy card,
// 4. what's still missing, 5. the builders' card. Everything sits inside a raised card (no bare text).
import { url, esc, suggestUrl, shot, SITE_URL, SOCIAL, counts } from '../lib.mjs';
import { appUrl, sortAlts } from '../cards.mjs';

// WHY a list: the picture cards need a replacement with a real screenshot.
// WHY ten (Destin, Nov 2): two rows of five shorter cards. Premiere Pro and Trello added for an editing and a work app.
const POPULAR = ['Google Docs', 'Adobe Photoshop', 'Microsoft Windows', 'Google Chrome', 'Notion', 'Google Photos', 'Figma', 'WhatsApp', 'Adobe Premiere Pro', 'Trello'];
// WHY these four for the top card's fan (Destin, Nov 2: "more visually interesting options"): 3D animation, painting, a game
// engine and video editing are colourful screens that show open source isn't only plain office windows. [project id, screenshot number]
const FAN = [['blender', 1], ['krita', 0], ['godot', 0], ['kdenlive', 1]];
// WHY by hand: the obvious answer isn't always the most-starred one (GIMP has no GitHub stars; it lives on GNOME's own server).
const LEAD = { 'Adobe Photoshop': 'gimp' };
// WHY everyday first (Destin picked "Everyday first, areas below" in the taxonomy-v2 deck, Oct 27): most visitors come to replace a
// paid app, so the everyday area's categories lead; the other five areas follow as one card each.
const EVERYDAY = 'everyday';
// WHY icons in icons.mjs (Nov 2): the category page heading uses the same ones.
import { catIcon } from '../icons.mjs';

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
    return lead ? { name, lead, total: alts.length } : null;
  }).filter(Boolean);
  // WHY the closed app's name as the title (Destin, Nov 2): visitors look for the app they want to leave; the count says what's
  // behind the click, so the "+5 more" chip went. The screenshot is still the best-known replacement's.
  const switchCard = ({ name, lead, total }) => `<a class="card pic swcard" href="${appUrl(name)}">
      ${lead.p.screenshots?.[0] ? `<div class="preview"><img src="${esc(shot(lead.p))}" alt="${esc(lead.p.name)} screenshot" loading="lazy" referrerpolicy="no-referrer"></div>` : '<div class="preview empty">No screenshot yet</div>'}
      <div class="inner">
        <div class="muted11">See ${total} ${total === 1 ? 'alternative' : 'alternatives'} for</div>
        <h3>${esc(name)}</h3>
      </div></a>`;


  // ── Categories: icon, name, a summary line and its first groups; the rest is one "+ more" chip ──
  // WHY stop the build if a fan screen is missing: a silently missing fan would look like a broken home page.
  const fan = FAN.map(([id, n]) => { const p = d.projById.get(id); const u = p && shot(p, n); if (!u) throw new Error(`home fan: no screenshot ${n} for "${id}"`); return u; });
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
        <div class="cathead"><span class="caticon">${catIcon(c.id, a.id)}</span><div><h3>${esc(c.name)}</h3><div class="desc12">${numbers(gs)}</div></div></div>
        <div class="gchips">${gs.slice(0, SHOWN).map((g) => `<a class="fchip" href="${url(`g/${g.id}/`)}">${esc(g.name)}</a>`).join('')}${gs.length > SHOWN ? `<a class="fchip more" href="${url(`c/${c.id}/`)}">+ ${gs.length - SHOWN} more</a>` : ''}</div>
      </div>`;
  };
  // ── Browse: ONE card; each area is a labelled row of category cards, everyday first ──
  // WHY (Destin, Oct 28: "confused about the hierarchy… clutter"): area cards and category cards looked the same but behaved
  // differently (areas have no page). Now areas are only headings, so every card is a category and every card opens one.
  // The ids let a category page's breadcrumb jump back to its area's row.
  const areaRows = [everyday, ...d.areas.filter((a) => a !== everyday)].map((a) => ({ a, cs: catsIn(a) })).filter(({ cs }) => cs.length)
    // WHY <details> (Destin, hierarchy deck, Oct 30: "all collapsible sections", "on mobile especially"): every area row folds, with
    // the browser's own keyboard and screen-reader support. WHY no name="…" group: the browser would then shut the other row
    // instantly, before site.js could slide it closed (the jump Destin saw, Nov 2). WHY every row starts closed (Destin, Nov 2; it was
    // only Everyday apps open before): the card is a short list of six areas to pick from. site.js opens a row a link points at
    // (#area-…, the trail's first link).
    .map(({ a, cs }) => `<details class="arearow" id="area-${a.id}">
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
  <!-- WHY no search box here (Destin, Nov 2): on the home page the top strip's search becomes a full search bar, so the card
       holds the headline and a fan of real app screens. -->
  <div class="surface hero3">
    <h1>Find free, open source replacements for almost any software</h1>
    <div class="fan" aria-hidden="true">${fan.map((u, i) => `<img class="f${i}" src="${esc(u)}" alt="" referrerpolicy="no-referrer">`).join('')}</div>
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
