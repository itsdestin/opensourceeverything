// One page per group (g/<id>/): the job, the closed apps it replaces, and its open alternatives.
// Ported from mockups/group-page.html. Votes, comments, "still missing", suggest and report need the server,
// so they only appear once API_URL is set (see lib.mjs).
import { esc, url, ICON, SITE_URL, API_URL, SOCIAL, codeUrl, suggestUrl } from '../lib.mjs';
import { altCard, appUrl, sortAlts, deviceFilter } from '../cards.mjs';

// WHY only the first letter, and not before a capital: "AI agents" and "PDF tools" keep their capitals mid-sentence.
const midSentence = (name) => name.replace(/^[A-Z](?![A-Z])/, (c) => c.toLowerCase());

function promptText(g, alts, full) {
  const ask = 'Compare it with my project or idea below. Tell me which projects overlap, what I could reuse instead of rewriting, and what mine does that none of them do.';
  if (!full) return `Read the list of open-source alternatives at ${SITE_URL}data/groups/${g.id}.json. ${ask}\n\nMy project or idea:\n`;
  return `Here is a list of open-source alternatives to ${g.closed.join(', ')} (${g.job.toLowerCase()}), from Open Source Everything (CC BY-SA 4.0):\n` +
    alts.map(({ p, a }) => `- ${p.name} (${p.license ?? 'license being checked'}${codeUrl(p) ? `, ${codeUrl(p)}` : p.website ? `, ${p.website}` : ''}; replaces ${a.fit === 'full' ? 'fully' : 'partly'}): ${p.summary}`).join('\n') +
    `\n\n${ask}\n\nMy project or idea:\n`;
}

const SORTS = [['fit', 'Fully replaces first'], ['stars', 'Most GitHub stars'], ['name', 'A to Z']];

export default function groupPages(d) {
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

    const body = `
  <div class="surface identity">
    <div class="row">
      <div><div class="muted11"><a class="crumb" href="${url(`c/${g.category}/`)}">${esc(cat?.name ?? '')}</a></div><h1 class="h-subject">${esc(g.name)}</h1><p class="desc12" style="margin-top:4px">${esc(g.job)}.</p></div>
    </div>
    <div class="chiprow">
      <span class="chip"><b>${alts.length}</b>open alternative${alts.length === 1 ? '' : 's'}</span>
      ${alts.length ? `<span class="chip"><b>${full}</b>${full === 1 ? 'does' : 'do'} the whole job</span>` : ''}
    </div>
    ${replacesRow}
  </div>

  <div class="cols">
    <div>
      <section class="surface sec">
        <div class="sec-head">
          <div><h2 class="h-large">Open alternatives<span class="count">${alts.length}</span></h2><p class="desc12">Open-source apps that replace <span data-compare-name>${esc(g.closed.length > 2 ? g.closed.slice(0, 2).join(', ') + ' and more' : g.closed.join(' and '))}</span></p></div>
          ${alts.length > 1 ? `<div class="tools">${deviceFilter('devMenu')}<div class="dd"><button class="select sm" type="button" data-menu="sortMenu" aria-haspopup="listbox" aria-expanded="false"><span data-sort-label>${SORTS[0][1]}</span>${ICON.chev}</button>
            <div class="menu" id="sortMenu" role="listbox">${SORTS.map(([k, v], i) => `<button class="mi${i ? '' : ' sel'}" type="button" role="option" data-sort="${k}">${v}</button>`).join('')}</div></div></div>` : ''}
        </div>
        ${alts.length
          ? `<div class="grid" data-alts>${alts.map((x, i) => altCard(x.p, x.a, i, g)).join('')}</div><div class="callout info" data-nomatch hidden>None of these match. Try another device.</div>`
          : `<div class="callout info">Nothing open does this job yet. That makes it a gap: if you're building one, <a href="${esc(suggestUrl('1-add-project', { group: g.name }))}" rel="noopener">add it here</a>.</div>`}
      </section>
      ${SOCIAL ? `<section class="surface sec" id="missing">
        <div class="sec-head"><div><h2 class="h-large">What's missing</h2><p class="desc12">What people still miss here, and wish existed. Upvote what matters to you.</p></div>
          <div class="btns-row"><a class="btn sm secondary" href="${url(`c/${g.category}/board/`)}">${esc(cat?.name ?? '')} board</a><button class="btn sm secondary" type="button" data-add-note data-category="${g.category}" data-group="${g.id}">Add a note</button></div></div>
        <div data-notes data-group="${g.id}" data-limit="6" data-more-href="${url(`c/${g.category}/board/?group=${g.id}`)}" data-empty="Nothing noted yet. Using one of these and something's missing? Add a note."></div>
      </section>` : ''}
    </div>

    <div>
      <section class="surface sec" id="build">
        <h2 class="h-large">Before you build</h2>
        <p class="small2">Planning something for ${esc(midSentence(g.name))}? See what exists first, so you can reuse parts or explain what's different. Paste this into any AI assistant:</p>
        <div class="lvl2 prompt" id="prompt-short">${esc(promptText(g, alts, false))}</div>
        <div id="prompt-full" hidden>${esc(promptText(g, alts, true))}</div>
        <div class="stack">
          <button class="btn md primary" type="button" data-copy="prompt-short" data-copied="Copied. Paste it into any AI assistant.">Copy prompt</button>
          <button class="btn md secondary" type="button" data-copy="prompt-full" data-copied="Copied, with the list. Paste it into any AI assistant.">Copy with the list included</button>
          <a class="btn md secondary" href="${url(`data/groups/${g.id}.json`)}" download="${g.id}.json">Download the list</a>
        </div>
      </section>
      <section class="surface sec">
        <div><h2 class="h-large">Fix the list itself</h2><p class="desc12" style="margin-top:4px">A project or closed app missing from this list, or a mistake on it? These open a short form on GitHub, and a mod reviews it. To say what a project can't do, use What's missing.</p></div>
        <div class="stack">
          <a class="btn md secondary" href="${esc(suggestUrl('1-add-project', { group: g.name }))}" rel="noopener">Add a project here</a>
          <a class="btn md secondary" href="${esc(suggestUrl('3-add-closed-app', { group: g.name }))}" rel="noopener">Add a closed app it replaces</a>
          <a class="btn md secondary" href="${esc(suggestUrl('2-fix', { group: g.name }))}" rel="noopener">Fix something on this page</a>
        </div>
      </section>
      <section class="surface sec" style="gap:8px">
        <h2 class="h-large">About this page</h2>
        <p class="small2"><b class="num">Replaces fully</b> means it does the main job of these apps; <b class="num">Replaces partly</b> means it covers some of it.</p>
        <p class="small2"><b class="num">Licenses</b>: every project here uses an open-source license (<a href="${url('licenses/')}">what each one means</a>). <b class="num">Open core</b> means some parts are paid or under another license.</p>
        <p class="small2"><b class="num">GitHub stars</b> are shown for reference. They measure popularity, not whether it replaces anything.</p>
        <p class="small2"><b class="num">Verified</b> means r/TrueOpenSource mods checked it: open-source license, maintained, and it really does the job.</p>
        <a class="btn md secondary full" href="${url('about/')}">How Open Source Everything works</a>
      </section>
    </div>
  </div>`;

    const jsonLd = {
      '@context': 'https://schema.org', '@type': 'ItemList', name: `Open-source alternatives to ${g.closed.join(', ')}`,
      itemListElement: alts.map(({ p }, i) => ({ '@type': 'ListItem', position: i + 1, item: {
        '@type': 'SoftwareApplication', name: p.name, url: `${SITE_URL}p/${p.id}/`, ...(p.license ? { license: p.license } : {}), applicationCategory: g.name } })),
    };
    return { path: `g/${g.id}/`, title: `Open-source alternatives to ${g.closed.slice(0, 2).join(' and ') || g.name}`, description, body, styles: ['group.css'], scripts: ['group.js'], jsonLd };
  });
}
