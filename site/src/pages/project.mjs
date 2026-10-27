// One page per open-source project (p/<id>/): what it is, which groups it's listed in, and its facts.
import { familyIndex, stoppedBanner } from '../family.mjs';
import { rvTop, rvFamilyA, crumbs } from '../redesign.mjs';
import { projectFeatures, helpWithAi } from '../surfaces.mjs';
import { esc, url, SITE_URL, KIND, SETUP, SETUP_MEANING, setupOf, setupWhy, factChips, hostOf, fmtStars, actions, codeUrl, devicesText, suggestUrl, shot, SOCIAL } from '../lib.mjs';

const HOSTS = { 'github.com': 'GitHub', 'gitlab.com': 'GitLab', 'codeberg.org': 'Codeberg' };

// "How to help" (review Oct 26): where a visitor who wants to pitch in goes next. Everything here comes from the project's own
// GitHub page (data/help.json, refreshed weekly) or from data/plugin-docs.json (hand-checked links); nothing is guessed.
// WHY the contributing guide is not a row here any more (reviewer, round 5): it opens inside the "AI contributions" fold (surfaces.mjs helpWithAi), so How to help is built the same way on every project.
function helpRows(p) {
  const h = p.help; if (!h) return '';
  const row = (href, title, note) => `<a class="btn md secondary helprow" href="${esc(href)}" rel="noopener"><span>${title}</span>${note ? `<span class="muted11">${note}</span>` : ''}</a>`;
  return [h.good ? row(h.good.url, `Good first issues<span class="count">${h.good.n}</span>`) : '', h.wanted ? row(h.wanted.url, `Help wanted<span class="count">${h.wanted.n}</span>`) : '', h.plugins ? row(h.plugins.url, esc(h.plugins.label)) : ''].join('');
}

export default function projectPages(d) {
  const fam = familyIndex(d);
  return d.projects.map((p) => {
    const listed = d.groupsByProject.get(p.id) ?? [];
    const host = HOSTS[hostOf(p)] ?? (p.code ? hostOf(p) : 'Its own website');
    // WHY reversed: YouCoded's design guide puts the filled main button on the right, outlined ones to its left.
    const links = actions(p).map((l, i) => `<a class="btn md ${i ? 'secondary' : 'primary'}" href="${esc(l.href)}" rel="noopener">${l.label}</a>`).reverse().join('');
    const replaces = [...new Set(listed.flatMap(({ group }) => group.closed.slice(0, 3)))];
    const description = `${p.name}: ${p.summary}`.slice(0, 300);

    // WHY no "What we couldn't confirm" section or "checked by AI" line (Destin, Oct 26): the AI pre-fill's notes are for mods,
    // not visitors. They stay in data/projects.json (field "unconfirmed"); the public copy of the data drops them (build.mjs).
    // WHY (forks stream): where it came from, in one plain line, and the reverse ("Forked by: Forgejo") on the original.
    const body = `
  ${crumbs(listed[0] ? [[d.catById.get(listed[0].group.category)?.name ?? '', url(`c/${listed[0].group.category}/`)], [listed[0].group.name, url(`g/${listed[0].group.id}/`)], [p.name]] : [[p.name]], { back: true, fallback: listed[0] ? url(`g/${listed[0].group.id}/`) : url() })}
  ${stoppedBanner(p, fam)}
  ${rvTop(p, links)}

  <div class="cols">
    <div>
  ${rvFamilyA(p, fam)}
  ${SOCIAL ? `<!-- WHY drawn in the browser (assets/contrib.js): a mod's approval shows at once, with no rebuild of the site. -->
      <section class="surface sec" data-dev-pitch data-mode="page" data-project="${esc(p.id)}" data-repo="${esc(codeUrl(p) ?? '')}" hidden></section>` : ''}
  ${p.screenshots?.length ? `<section class="surface sec fold-phone${p.screenshots.length < 3 ? ' shots-few' : ''}">
        <div class="sec-head fold-head"><div><h2 class="h-large">Screenshots${p.screenshots.length > 1 ? `<span class="count">${p.screenshots.length}</span>` : ''}</h2></div></div>
        <!-- WHY small thumbnails (Destin, Oct 27: full-size pictures were "overwhelming"); full size opens in a viewer. -->
        <div class="thumbstrip">${p.screenshots.map((u, i) => `<button class="thumb" type="button" data-shot="${esc(u)}" aria-label="Screenshot ${i + 1} of ${p.screenshots.length}, full size"><img src="${esc(shot(p, i))}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('')}</div>
      </section>` : ''}
      <section class="surface sec fold-phone">
        <!-- WHY (reviewer, round 5): with ONE group there is no box in a box and no empty heading line: the fit pill sits on the section's own line and the vote box is the only box. With several groups each gets a named row. -->
        ${(() => { const pillOf = (alt) => `<span class="pill ${alt.fit === 'full' ? 'ok' : 'info'}" title="${alt.fit === 'full' ? 'It does the main job of these apps' : 'It covers some of what these apps do'}">${alt.fit === 'full' ? '<i></i>Replaces fully' : 'Replaces partly'}</span>`;
          const rate = ({ group }) => (SOCIAL ? `<div class="rate lvl2" data-rate data-group="${group.id}" data-project="${esc(p.id)}" data-question="${esc(`Does ${p.name} do this job?`)}"></div>` : '');
          if (listed.length === 1) { const { group, alt } = listed[0]; return `<div class="sec-head fold-head"><div><h2 class="h-large">Listed in</h2></div>${pillOf(alt)}</div>${alt.note ? `<p class="small2">${esc(alt.note)}</p>` : ''}${rate({ group })}`; }
          return `<div class="sec-head fold-head"><div><h2 class="h-large">Listed in<span class="count">${listed.length}</span></h2></div></div><div class="stack">${listed.map(({ group, alt }) => `<div class="lvl1 listrow"><div class="head"><h3><a class="cardlink" href="${url(`g/${group.id}/`)}">${esc(group.name)}</a></h3>${pillOf(alt)}</div>${alt.note ? `<p class="small2">${esc(alt.note)}</p>` : ''}${rate({ group })}</div>`).join('')}</div>`; })()}
      </section>
      ${projectFeatures(p, listed)}
    </div>
    <div>
      ${helpWithAi(p, helpRows(p), p.help?.contributing)}
      <!-- WHY no Facts card any more (Destin: drop what the page already shows): every line of it was already a chip in the top card. -->
      <section class="surface sec fold-phone">
        <div class="fold-head"><h2 class="h-large">Something wrong?</h2></div>
        <div class="stack">
          <a class="btn md secondary" href="${esc(suggestUrl('2-fix', { project: p.name }))}" rel="noopener">Suggest a fix</a>
          <a class="btn md secondary" href="${esc(suggestUrl('5-report', { project: p.name }))}" rel="noopener">Report this project</a>
        </div>
      </section>
    </div>
  </div>`;

    const jsonLd = {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: p.name, description: p.summary, url: `${SITE_URL}p/${p.id}/`,
      ...(p.license ? { license: p.license } : {}), ...(codeUrl(p) ? { codeRepository: codeUrl(p) } : {}), ...(p.website ? { sameAs: p.website } : {}),
      applicationCategory: listed[0]?.group.name,
    };
    return { path: `p/${p.id}/`, title: replaces.length ? `${p.name}: open-source alternative to ${replaces.slice(0, 2).join(' and ')}` : p.name, description, body, styles: ['group.css', 'surfaces.css'], scripts: [...(p.screenshots?.length ? ['gallery.js'] : []), 'surfaces.js'], jsonLd };
  });
}
