// One page per group (g/<id>/): the job, the closed apps it replaces, and its open alternatives.
// Ported from mockups/group-page.html. Votes, comments, "still missing", suggest and report need the server,
// so they only appear once API_URL is set (see lib.mjs).
import { esc, url, ICON, SITE_URL, API_URL, KIND, factChips, statusPill, hostOf, actions, codeUrl } from '../lib.mjs';

const hostLabel = (p) => ({ 'github.com': 'GitHub', 'gitlab.com': 'GitLab', 'codeberg.org': 'Codeberg' }[hostOf(p)] ?? 'Own website');

function altCard(p, alt, i) {
  const foot = [KIND[p.kind], hostLabel(p), alt.note].filter(Boolean).join(' · ');
  const acts = actions(p);
  const shot = p.screenshots?.[0];
  // WHY this layout (Destin chose option B, Oct 27): a screenshot on every card, framed like the app's
  // Marketplace theme previews, and one "Actions" menu instead of a row of buttons.
  // WHY a stretched title link: the card also holds the Actions menu, and links can't sit inside links.
  return `<div class="card pic" data-fit="${alt.fit}" data-stars="${p.stars ?? 0}" data-name="${esc(p.name.toLowerCase())}" data-order="${i}">
      ${shot ? `<div class="preview"><img src="${esc(shot)}" alt="${esc(p.name)} screenshot" loading="lazy" referrerpolicy="no-referrer"></div>` : '<div class="preview empty">No screenshot yet</div>'}
      <div class="inner">
        <div class="head"><h3><a class="cardlink" href="${url(`p/${p.id}/`)}">${esc(p.name)}</a></h3><div class="corner" style="margin-right:0">${statusPill(p)}</div></div>
        <div class="chiprow">${factChips(p, alt)}</div>
        <p class="blurb">${esc(p.summary)}</p>
        <div class="foot">${esc(foot)}</div>
        ${acts.length ? `<div class="dd actions"><button class="btn sm secondary" type="button" data-menu="act-${esc(p.id)}" aria-haspopup="menu" aria-expanded="false">Actions ${ICON.chev}</button>
          <div class="menu left" id="act-${esc(p.id)}" role="menu">${acts.map((l) => `<a class="mi" role="menuitem" href="${esc(l.href)}" rel="noopener">${l.label}</a>`).join('')}<a class="mi" role="menuitem" href="${url(`p/${p.id}/`)}">See full details</a></div></div>` : ''}
      </div>
    </div>`;
}

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
    const alts = g.alternatives.map((a) => ({ a, p: d.projById.get(a.project) })).filter((x) => x.p)
      // WHY default order: whole-job replacements first, then by GitHub stars as a rough popularity signal.
      .sort((x, y) => (x.a.fit === y.a.fit ? 0 : x.a.fit === 'full' ? -1 : 1) || (y.p.stars ?? 0) - (x.p.stars ?? 0));
    const full = alts.filter((x) => x.a.fit === 'full').length;
    const first = g.closed[0] ?? '';
    const description = alts.length
      ? `${alts.length} open-source alternative${alts.length === 1 ? '' : 's'} to ${g.closed.slice(0, 3).join(', ')}: ${alts.slice(0, 4).map((x) => x.p.name).join(', ')}${alts.length > 4 ? ' and more' : ''}.`
      : `No open-source app does the job of ${g.closed.join(', ')} yet. See what's missing, or build one.`;

    // WHY no "Compared with" dropdown (Destin, Oct 27: "doesn't seem to do anything"): until the server adds
    // per-app sections ("Why people leave X"), switching apps changed only a label. The closed apps are shown as
    // chips instead; the one a visitor searched for (?compare=) is highlighted by group.js.
    const replacesRow = g.closed.length ? `<div class="replaces-row"><span class="muted11">Replaces</span><div class="chiprow">${g.closed.map((c) => `<span class="chip" data-app="${esc(c)}">${esc(c)}</span>`).join('')}</div></div>` : '';

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
          ${alts.length > 1 ? `<div class="dd"><button class="select sm" type="button" data-menu="sortMenu" aria-haspopup="listbox" aria-expanded="false"><span data-sort-label>${SORTS[0][1]}</span>${ICON.chev}</button>
            <div class="menu" id="sortMenu" role="listbox">${SORTS.map(([k, v], i) => `<button class="mi${i ? '' : ' sel'}" type="button" role="option" data-sort="${k}">${v}</button>`).join('')}</div></div>` : ''}
        </div>
        ${alts.length
          ? `<div class="grid" data-alts>${alts.map((x, i) => altCard(x.p, x.a, i)).join('')}</div>`
          : `<div class="callout info">Nothing open does this job yet. That makes it a gap: if you're building one, <a href="${API_URL ? url(`g/${g.id}/#add`) : 'https://www.reddit.com/r/TrueOpenSource/'}" rel="noopener">${API_URL ? 'add it here' : 'share it on r/TrueOpenSource'}</a>.</div>`}
      </section>
    </div>

    <div>
      <section class="surface sec">
        <h2 class="h-large">Before you build</h2>
        <p class="small2">Planning something for ${esc(g.name.toLowerCase())}? See what exists first, so you can reuse parts or explain what's different. Paste this into any AI assistant:</p>
        <div class="lvl2 prompt" id="prompt-short">${esc(promptText(g, alts, false))}</div>
        <div id="prompt-full" hidden>${esc(promptText(g, alts, true))}</div>
        <div class="stack">
          <button class="btn md primary" type="button" data-copy="prompt-short" data-copied="Copied. Paste it into any AI assistant.">Copy prompt</button>
          <button class="btn md secondary" type="button" data-copy="prompt-full" data-copied="Copied, with the list. Paste it into any AI assistant.">Copy with the list included</button>
          <a class="btn md secondary" href="${url(`data/groups/${g.id}.json`)}" download="${g.id}.json">Download the list</a>
        </div>
      </section>
      <section class="surface sec" style="gap:8px">
        <h2 class="h-large">About this page</h2>
        <p class="small2"><b class="num">Replaces fully</b> means it does the main job of these apps; <b class="num">Replaces partly</b> means it covers some of it.</p>
        <p class="small2"><b class="num">Licenses</b>: every project here uses an open-source license. <b class="num">Open core</b> means some parts are paid or under another license.</p>
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
