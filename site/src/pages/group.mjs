// One page per group (g/<id>/): the job, the closed apps it replaces, and its open alternatives.
// Ported from mockups/group-page.html. Votes, comments, "still missing", suggest and report need the server,
// so they only appear once API_URL is set (see lib.mjs).
import { esc, url, ICON, SITE_URL, API_URL, SOCIAL, SUBREDDIT, codeUrl, suggestUrl } from '../lib.mjs';
import { altCard, appUrl, sortAlts, deviceFilter, buildBox, chooseBox, FILTERS } from '../cards.mjs';
import { relatedGroups } from '../related.mjs';
import { likedBox } from '../liked.mjs';
import { crumbs } from '../redesign.mjs';
import { groupTools, groupCompare, tagsOf } from '../surfaces.mjs';

// WHY only the first letter, and not before a capital: "AI agents" and "PDF tools" keep their capitals mid-sentence.
const midSentence = (name) => name.replace(/^[A-Z](?![A-Z])/, (c) => c.toLowerCase());


// WHY two orders (Destin, Oct 26: Easy setup first, nothing hidden): the default "Best match" is the ranking score, which
// gives Easy setup a modest lift but still lets a much better fit win. "Easy setup first" is the strict version: every Easy
// one, then every Advanced one, each in best-match order.
const SORTS = [['fit', 'Best match'], ['setup', 'Easy setup first'], ['stars', 'Most GitHub stars'], ['votes', 'Most voted'], ['name', 'A to Z']];

export default function groupPages(d) {
  const related = relatedGroups(d);
  return d.groups.map((g) => {
    const cat = d.catById.get(g.category);
    const alts = sortAlts(g.alternatives.map((a) => ({ a, p: d.projById.get(a.project) })).filter((x) => x.p));
    const full = alts.filter((x) => x.a.fit === 'full').length;
    const first = g.closed[0] ?? '';
    // WHY two wordings (Destin approved "no Replaces line when there's no paid rival", Oct 27): a job-only group is described by its job.
    const what = g.closed.length ? `alternative${alts.length === 1 ? '' : 's'} to ${g.closed.slice(0, 3).join(', ')}` : `project${alts.length === 1 ? '' : 's'} for ${midSentence(g.name)}`;
    const description = alts.length
      ? `${alts.length} open-source ${what}: ${alts.slice(0, 4).map((x) => x.p.name).join(', ')}${alts.length > 4 ? ' and more' : ''}.`
      : `No open-source app does the job of ${g.closed.join(', ') || midSentence(g.name)} yet. See what's missing, or build one.`;

    // WHY no "Compared with" dropdown (Destin, Oct 27: "doesn't seem to do anything"): until the server adds
    // per-app sections ("Why people leave X"), switching apps changed only a label. The closed apps are shown as
    // chips instead; the one a visitor searched for (?compare=) is highlighted by group.js.
    const replacesRow = g.closed.length ? `<div class="replaces-row"><span class="muted11">Replaces</span><div class="chiprow">${g.closed.map((c) => `<a class="chip" data-app="${esc(c)}" href="${appUrl(c)}">${esc(c)}</a>`).join('')}</div></div>` : '';

    // WHY no job line under the group name (Destin, Oct 27: "Web browsers / Browsing the web" says nothing the name and the
    // Replaces row don't). Same for category cards, closed-app sections and See also. The AI prompts still get the job sentence.
    const body = `
  ${crumbs([[cat?.name ?? '', url(`c/${g.category}/`)], [g.name]])}
  <div class="surface identity">
    <div class="row">
      <div><h1 class="h-subject">${esc(g.name)}</h1></div>
      <!-- WHY a search link for now (Destin): a bot-made thread per group comes later; until then this opens the subreddit's search for the group's name. -->
      <a class="btn sm secondary" href="${esc(`${SUBREDDIT}search?q=${encodeURIComponent(g.name)}&restrict_sr=1`)}" rel="noopener">Talk about this on r/TrueOpenSource</a>
    </div>
    ${replacesRow}
  </div>

  <div class="cols">
    <div>
      <section class="surface sec">
        <!-- WHY one cluster at the right of the heading line (Destin, round 5 slides): [Cards | Compare] then the three menus, flush right at one height. On a phone the cluster is ONE Filter button that opens a bottom sheet (same pattern as search). -->
        <div class="sec-head">
          <div><h2 class="h-large">Open alternatives<span class="count">${alts.length}</span></h2></div>
          ${alts.length > 1 ? (() => { const t = groupTools(g, alts); const tags = tagsOf(g);
            const sortDd = `<div class="dd"><button class="select sm" type="button" data-menu="sortMenu" aria-haspopup="listbox" aria-expanded="false"><span data-sort-label>${SORTS[0][1]}</span>${ICON.chev}</button>
              <div class="menu" id="sortMenu" role="listbox">${SORTS.map(([k, v], i) => `<button class="mi${i ? '' : ' sel'}" type="button" role="option" data-sort="${k}"${k === 'votes' ? ' disabled title="Available once people have voted"' : ''}>${v}</button>`).join('')}</div></div>`;
            const rad = (attrs, label, on, dis) => `<button type="button" class="mi opt rad${on ? ' sel' : ''}" role="radio" aria-checked="${on}" ${attrs}${dis ? ' disabled' : ''}><span class="ctl" aria-hidden="true"></span><span class="ol">${label}</span></button>`;
            const chk = (attrs, label) => `<button type="button" class="mi opt chk" role="checkbox" aria-checked="false" ${attrs}><span class="ctl" aria-hidden="true">${ICON.check}</span><span class="ol">${label}</span></button>`;
            const sheet = `<div class="dd gfilter"><button class="btn sm secondary sres-filterbtn" type="button" data-menu="gSheet" aria-haspopup="dialog" aria-expanded="false">Filter<span class="fcount" data-gcount hidden></span>${ICON.chev}</button>
              <div class="menu fsheet gsheet" id="gSheet" role="dialog" aria-label="Filter and sort"><span class="handle" aria-hidden="true"></span><div class="fscroll">
                ${t.seg ? `<div class="fgroup"><div class="label">View</div>${t.seg.replace('class="seg"', 'class="seg wide"')}</div>` : ''}
                <div class="fgroup" role="radiogroup" aria-label="Works on"><div class="label">Works on</div>${FILTERS.map(([k, v], i) => rad(`data-device="${k}"`, v, !i)).join('')}</div>
                ${tags.length ? `<div class="fgroup" role="group" aria-label="Must have"><div class="label">Must have</div>${tags.map((x) => chk(`data-must="${esc(x.id)}"`, esc(x.name))).join('')}</div>` : ''}
                <div class="fgroup" role="radiogroup" aria-label="Sort"><div class="label">Sort</div>${SORTS.map(([k, v], i) => rad(`data-sort="${k}"`, v, !i, k === 'votes')).join('')}</div>
              </div><div class="fsfoot"><button type="button" class="btn md secondary" data-gclear>Clear</button><button type="button" class="btn md primary" data-gshow>Show results</button></div></div></div>`;
            return `<div class="gtools">${t.seg}${deviceFilter('devMenu')}${t.must}${sortDd}${sheet}</div>`; })() : ''}
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
        <div class="grid">${related.get(g.id).map((r) => `<a class="card listing" href="${url(`g/${r.g.id}/`)}"><div class="head"><h3>${esc(r.g.name)}</h3></div><span class="muted11">${r.reason ? esc(r.reason) : '&nbsp;'}</span></a>`).join('')}</div>
      </section>
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

    const listName = g.closed.length ? `Open-source alternatives to ${g.closed.join(', ')}` : `Open-source projects: ${g.name}`;
    const jsonLd = {
      '@context': 'https://schema.org', '@type': 'ItemList', name: listName,
      itemListElement: alts.map(({ p }, i) => ({ '@type': 'ListItem', position: i + 1, item: {
        '@type': 'SoftwareApplication', name: p.name, url: `${SITE_URL}p/${p.id}/`, ...(p.license ? { license: p.license } : {}), applicationCategory: g.name } })),
    };
    return { path: `g/${g.id}/`, title: g.closed.length ? `Open-source alternatives to ${g.closed.slice(0, 2).join(' and ')}` : `${g.name}: open-source projects`, description, body, styles: ['group.css', 'surfaces.css'], scripts: ['group.js', 'surfaces.js'], jsonLd };
  });
}
