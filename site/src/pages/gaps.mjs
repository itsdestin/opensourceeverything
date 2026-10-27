// The gaps page (gaps/): every job where open source falls short, worst first.
// WHY its own page (Destin, Oct 27): tracking what's still missing is what no other alternatives site does,
// so it gets a front door instead of one row on the home page.
import { esc, url, SOCIAL } from '../lib.mjs';
import { appUrl } from '../cards.mjs';
import { gapsMissing } from '../surfaces.mjs';

// WHY everyday categories first within each tier: most visitors and most builders care about those.
// (taxonomy-v2: "everyday" is now an area holding the nine everyday categories; the rest come after in data order.)
export default function gaps(d) {
  const catOrder = (g) => (d.areaOf.get(g.category)?.id === 'everyday' ? 0 : 100) + d.categories.findIndex((c) => c.id === g.category);
  const fulls = (g) => g.alternatives.filter((a) => a.fit === 'full');
  const tiers = [
    { id: 'none', name: 'Nothing open yet', desc: 'No open-source project does any of this job.', pill: 'No open alternative yet',
      test: (g) => g.alternatives.length === 0 },
    { id: 'partial', name: 'Only part of the job', desc: 'Open projects cover some of it, but none replaces the whole thing.', pill: 'Only partial replacements',
      test: (g) => g.alternatives.length > 0 && fulls(g).length === 0 },
    { id: 'one', name: 'Only one full replacement', desc: "One open project does the whole job. If it stalls, there's nothing else.", pill: 'One full replacement',
      test: (g) => fulls(g).length === 1 },
  ].map((t) => ({ ...t, groups: d.groups.filter(t.test).sort((a, b) => catOrder(a) - catOrder(b) || a.name.localeCompare(b.name)) }));

  // WHY (reviewer, round 5): the card's name links to the group, so there is no second "See the group" button; at most ONE outlined "Before you build" per card (dozens of filled buttons made the page shout);
  // the section heading already says "Only part of the job", so cards no longer repeat that as a pill; each partial project's note sits on the project's own line.
  const card = (g, t) => {
    const parts = g.alternatives.filter((a) => a.fit === 'partial').map((a) => ({ a, p: d.projById.get(a.project) })).filter((x) => x.p);
    const only = t.id === 'one' ? d.projById.get(fulls(g)[0].project) : null;
    return `<div class="card gcard">
      <div class="head"><h3><a class="crumb-strong" href="${url(`g/${g.id}/`)}">${esc(g.name)}</a></h3></div>
      <div class="chiprow">${g.closed.map((c) => `<a class="chip" href="${appUrl(c)}">${esc(c)}</a>`).join('')}</div>
      ${only ? `<p class="small2">Only <a href="${url(`p/${only.id}/`)}">${esc(only.name)}</a> does the whole job.</p>` : ''}
      ${t.id === 'partial' && parts.length ? `<ul class="partlist">${parts.map(({ a, p }) => `<li><a href="${url(`p/${p.id}/`)}">${esc(p.name)}</a>${a.note ? `<span>${esc(a.note)}</span>` : ''}</li>`).join('')}</ul>` : ''}
      <div class="gapbtns"><a class="btn sm secondary" href="${url(`g/${g.id}/#build`)}">Before you build</a></div>
    </div>`;
  };

  const total = tiers[0].groups.length + tiers[1].groups.length;
  const body = `
  <div class="surface identity">
    <div><h1 class="h-subject">What open source doesn't replace yet</h1>
      <p class="desc12" style="margin-top:4px">Jobs with no full open-source replacement, and jobs that rely on a single project.</p></div>
    <div class="pop" style="padding-left:0"><span class="muted11">Jump to</span><div class="fchips">${tiers.filter((t) => t.groups.length).map((t) => `<a class="fchip" href="#${t.id}">${esc(t.name)}<span class="n">${t.groups.length}</span></a>`).join('')}</div></div>
  </div>
  ${SOCIAL ? `<section class="surface sec" id="requested">
    <div class="sec-head"><div><h2 class="h-large">Most requested</h2></div></div>
    <div data-most-requested data-limit="12"></div>
  </section>` : ''}
  ${tiers.filter((t) => t.groups.length).map((t) => `
  <section class="surface sec" id="${t.id}">
    <div class="sec-head"><div><h2 class="h-large">${esc(t.name)}<span class="count">${t.groups.length}</span></h2></div></div>
    <div class="gaplist">${t.groups.map((g) => card(g, t)).join('')}</div>
  </section>`).join('')}
  ${gapsMissing(d)}`;

  return [{
    path: 'gaps/', title: "Gaps: what open source doesn't replace yet", styles: ['pages.css', 'surfaces.css'], body,
    description: `${total} jobs where no open-source app fully replaces the closed ones yet, and ${tiers[2].groups.length} that rely on a single project. Supported by r/TrueOpenSource.`,
  }];
}
