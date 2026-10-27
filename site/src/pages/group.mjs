// One page per group (g/<id>/): the job, the closed apps it replaces, and its open alternatives.
// Ported from mockups/group-page.html. Votes, comments, "still missing", suggest and report need the server,
// so they only appear once API_URL is set (see lib.mjs).
import { esc, url, ICON, SITE_URL, API_URL, SOCIAL, codeUrl, suggestUrl } from '../lib.mjs';
import { altCard, appUrl, sortAlts, deviceFilter, buildBox, chooseBox } from '../cards.mjs';
import { relatedGroups } from '../related.mjs';
import { likedBox } from '../liked.mjs';
import { groupTools, groupCompare } from '../surfaces.mjs';

// WHY only the first letter, and not before a capital: "AI agents" and "PDF tools" keep their capitals mid-sentence.
const midSentence = (name) => name.replace(/^[A-Z](?![A-Z])/, (c) => c.toLowerCase());


// WHY two orders (Destin, Oct 26: Easy setup first, nothing hidden): the default "Best match" is the ranking score, which
// gives Easy setup a modest lift but still lets a much better fit win. "Easy setup first" is the strict version: every Easy
// one, then every Advanced one, each in best-match order.
const SORTS = [['fit', 'Best match'], ['setup', 'Easy setup first'], ['stars', 'Most GitHub stars'], ['name', 'A to Z']];

export default function groupPages(d) {
  const related = relatedGroups(d);
  return d.groups.map((g) => {
    const cat = d.catById.get(g.category);
    const alts = sortAlts(g.alternatives.map((a) => ({ a, p: d.projById.get(a.project) })).filter((x) => x.p));
    const full = alts.filter((x) => x.a.fit === 'full').length;
    const first = g.closed[0] ?? '';
    const description = alts.length
      ? `${alts.length} open-source alternative${alts.length === 1 ? '' : 's'} to ${g.closed.slice(0, 3).join(', ')}: ${alts.slice(0, 4).map((x) => x.p.name).join(', ')}${alts.length > 4 ? ' and more' : ''}.`
      : `No open-source app does the job of ${g.closed.join(', ')} yet. See what's missing, or build one.`;

    // WHY no "Compared with" dropdown (Destin, Oct 27: "doesn't seem to do anything"): until the server adds
    // per-app sections ("Why people leave X"), switching apps changed only a label. The closed apps are shown as
    // chips instead; the one a visitor searched for (?compare=) is highlighted by group.js.
    const replacesRow = g.closed.length ? `<div class="replaces-row"><span class="muted11">Replaces</span><div class="chiprow">${g.closed.map((c) => `<a class="chip" data-app="${esc(c)}" href="${appUrl(c)}">${esc(c)}</a>`).join('')}</div></div>` : '';

    // WHY no job line under the group name (Destin, Oct 27: "Web browsers / Browsing the web" says nothing the name and the
    // Replaces row don't). Same for category cards, closed-app sections and See also. The AI prompts still get the job sentence.
    const body = `
  <div class="surface identity">
    <div class="row">
      <div><div class="muted11"><a class="crumb" href="${url(`c/${g.category}/`)}">${esc(cat?.name ?? '')}</a></div><h1 class="h-subject">${esc(g.name)}</h1></div>
    </div>
    ${replacesRow}
  </div>

  <div class="cols">
    <div>
      <section class="surface sec">
        <div class="sec-head">
          <div><h2 class="h-large">Open alternatives<span class="count">${alts.length}</span></h2></div>
          ${alts.length > 1 ? `<div class="tools">${deviceFilter('devMenu')}${groupTools(g, alts)}<div class="dd"><button class="select sm" type="button" data-menu="sortMenu" aria-haspopup="listbox" aria-expanded="false"><span data-sort-label>${SORTS[0][1]}</span>${ICON.chev}</button>
            <div class="menu" id="sortMenu" role="listbox">${SORTS.map(([k, v], i) => `<button class="mi${i ? '' : ' sel'}" type="button" role="option" data-sort="${k}">${v}</button>`).join('')}</div></div></div>` : ''}
        </div>
        ${likedBox(g, alts)}
        ${alts.length
          ? `<div class="grid" data-alts>${alts.map((x, i) => altCard(x.p, x.a, i, g, x.why)).join('')}</div><div class="callout info" data-nomatch hidden>None of these match. Try another device.</div>${groupCompare(g, alts)}`
          : `<div class="callout info">Nothing open does this job yet. That makes it a gap: if you're building one, <a href="${esc(suggestUrl('1-add-project', { group: g.name }))}" rel="noopener">add it here</a>.</div>`}
        ${SOCIAL && !alts.some(({ a }) => a.fit === 'full') ? `<!-- WHY (review Oct 26): "I want this too" counts demand for a job nothing open fully does; ranked under Most requested -->
        <div class="want" data-request data-key="group:${g.id}" hidden></div>` : ''}
      </section>
      <section class="surface sec" id="see-also">
        <div class="sec-head"><div><h2 class="h-large">See also</h2></div></div>
        <div class="grid">${related.get(g.id).map((r) => `<a class="card listing" href="${url(`g/${r.g.id}/`)}"><div class="head"><h3>${esc(r.g.name)}</h3></div>${r.reason ? `<span class="muted11">${esc(r.reason)}</span>` : ''}</a>`).join('')}</div>
      </section>
      ${SOCIAL ? `<section class="surface sec" id="missing">
        <div class="sec-head"><div><h2 class="h-large">What's missing</h2></div>
          <div class="btns-row"><a class="btn sm secondary" href="${url(`c/${g.category}/board/`)}">${esc(cat?.name ?? '')} board</a><button class="btn sm secondary" type="button" data-add-note data-category="${g.category}" data-group="${g.id}">Add a note</button></div></div>
        <div data-notes data-group="${g.id}" data-limit="6" data-more-href="${url(`c/${g.category}/board/?group=${g.id}`)}" data-empty="Nothing noted yet."></div>
      </section>` : ''}
    </div>

    <div>
      ${alts.length > 1 ? chooseBox({ closed: g.closed, job: g.job, json: `data/groups/${g.id}.json`, alts }) : ''}
      ${buildBox({ about: midSentence(g.name), closed: g.closed, job: g.job, json: `data/groups/${g.id}.json`, alts })}
      <section class="surface sec fold-phone">
        <div class="fold-head"><h2 class="h-large">Fix the list itself</h2></div>
        <div class="stack">
          <a class="btn md secondary" href="${esc(suggestUrl('1-add-project', { group: g.name }))}" rel="noopener">Add a project here</a>
          <a class="btn md secondary" href="${esc(suggestUrl('3-add-closed-app', { group: g.name }))}" rel="noopener">Add a closed app it replaces</a>
          <a class="btn md secondary" href="${esc(suggestUrl('2-fix', { group: g.name }))}" rel="noopener">Fix something on this page</a>
        </div>
      </section>
    </div>
  </div>`;

    const jsonLd = {
      '@context': 'https://schema.org', '@type': 'ItemList', name: `Open-source alternatives to ${g.closed.join(', ')}`,
      itemListElement: alts.map(({ p }, i) => ({ '@type': 'ListItem', position: i + 1, item: {
        '@type': 'SoftwareApplication', name: p.name, url: `${SITE_URL}p/${p.id}/`, ...(p.license ? { license: p.license } : {}), applicationCategory: g.name } })),
    };
    return { path: `g/${g.id}/`, title: `Open-source alternatives to ${g.closed.slice(0, 2).join(' and ') || g.name}`, description, body, styles: ['group.css', 'surfaces.css'], scripts: ['group.js', 'surfaces.js'], jsonLd };
  });
}
