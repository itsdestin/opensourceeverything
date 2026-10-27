// One page per open-source project (p/<id>/): what it is, which groups it's listed in, and its facts.
import { familyIndex, ownLine, reverseLines, familySection, stoppedBanner } from '../family.mjs';
import { esc, url, SITE_URL, KIND, factChips, hostOf, fmtStars, actions, codeUrl, devicesText, suggestUrl, shot, SOCIAL } from '../lib.mjs';

const HOSTS = { 'github.com': 'GitHub', 'gitlab.com': 'GitLab', 'codeberg.org': 'Codeberg' };

export default function projectPages(d) {
  const fam = familyIndex(d);
  return d.projects.map((p) => {
    const listed = d.groupsByProject.get(p.id) ?? [];
    const host = HOSTS[hostOf(p)] ?? (p.code ? hostOf(p) : 'Its own website');
    // WHY reversed: YouCoded's design guide puts the filled main button on the right, outlined ones to its left.
    const links = actions(p).map((l, i) => `<a class="btn md ${i ? 'secondary' : 'primary'}" href="${esc(l.href)}" rel="noopener">${l.label}</a>`).reverse().join('');
    const replaces = [...new Set(listed.flatMap(({ group }) => group.closed.slice(0, 3)))];
    const description = `${p.name}: ${p.summary}`.slice(0, 300);

    // WHY (forks stream): where it came from, in one plain line, and the reverse ("Forked by: Forgejo") on the original.
    const famLines = [ownLine(p, fam), ...reverseLines(p, fam, 6)].filter(Boolean);
    const body = `
  ${stoppedBanner(p, fam)}
  <div class="surface identity">
    <div class="row">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><h1 class="h-subject">${esc(p.name)}</h1></div>
    </div>
    <div class="chiprow">${factChips(p, null, '', { links: true })}</div>
    <p class="body2">${esc(p.summary)}</p>
    ${famLines.length ? `<p class="famline">${famLines.join('<br>')} <a class="famlink" href="#family">See the family</a></p>` : ''}
    <div class="idfoot"><p class="muted11">Description written from the project's own page; checked by AI.</p>${links ? `<div class="links">${links}</div>` : ''}</div>
  </div>

  <div class="cols">
    <div>
  ${p.screenshots?.length ? `<section class="surface sec">
        <div class="sec-head"><div><h2 class="h-large">Screenshots<span class="count">${p.screenshots.length}</span></h2><p class="desc12">From ${esc(p.name)}'s own page. Click one to see it full size.</p></div></div>
        <!-- WHY small thumbnails (Destin, Oct 27: full-size pictures were "overwhelming"); full size opens in a viewer. -->
        <div class="thumbstrip">${p.screenshots.map((u, i) => `<button class="thumb" type="button" data-shot="${esc(u)}" aria-label="Screenshot ${i + 1} of ${p.screenshots.length}, full size"><img src="${esc(shot(p, i))}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('')}</div>
      </section>` : ''}
      <section class="surface sec">
        <div class="sec-head"><div><h2 class="h-large">Listed in<span class="count">${listed.length}</span></h2><p class="desc12">The jobs it does, and the closed apps it replaces</p></div></div>
        <div class="stack">${listed.map(({ group, alt }) => `
          <div class="card listing">
            <div class="head"><h3><a class="cardlink" href="${url(`g/${group.id}/`)}">${esc(group.name)}</a></h3><span class="pill ${alt.fit === 'full' ? 'ok' : 'info'}">${alt.fit === 'full' ? '<i></i>Replaces fully' : 'Replaces partly'}</span></div>
            <p class="small2">Instead of ${esc(group.closed.join(', '))}${alt.note ? ` · ${esc(alt.note)}` : ''}</p>
            ${SOCIAL ? `<div class="rate lvl2" data-rate data-group="${group.id}" data-project="${esc(p.id)}" data-question="${esc(`Does ${p.name} do the job of ${group.closed.length > 3 ? group.closed.slice(0, 3).join(', ') + ' and others' : group.closed.length > 1 ? group.closed.slice(0, -1).join(', ') + ' and ' + group.closed.at(-1) : group.closed[0] ?? 'these apps'}?`)}"></div>` : ''}
          </div>`).join('')}
        </div>
      </section>
      ${familySection(p, fam)}
      ${SOCIAL && listed.length ? `<section class="surface sec">
        <div class="sec-head"><div><h2 class="h-large">What's missing</h2><p class="desc12">Things people miss in ${esc(p.name)}. Upvote what matters to you; it helps its team decide.</p></div>
          <button class="btn sm secondary" type="button" data-add-note data-category="${listed[0].group.category}" data-group="${listed[0].group.id}" data-groups="${listed.map(({ group }) => group.id).join(',')}" data-project="${esc(p.id)}" data-kind="missing">Add a note</button></div>
        <div data-notes data-project="${esc(p.id)}" data-empty="Nothing noted yet."></div>
      </section>` : ''}
    </div>
    <div>
      <section class="surface sec fold-phone">
        <h2 class="h-large fold-head">Facts</h2>
        <div class="lvl1 facts">
          <div class="fact"><span>License</span><span>${esc(p.license ?? 'Being checked')}</span></div>
          ${p.licenseNeedsCheck ? '<div class="fact"><span></span><span class="muted11">A mod is confirming this license</span></div>' : ''}
          ${p.licenseClass === 'open_core' ? '<div class="fact"><span>Paid parts</span><span>Open core: some parts paid</span></div>' : ''}
          ${devicesText(p) || p.platforms?.includes('server') ? `<div class="fact"><span>Runs on</span><span>${esc([devicesText(p), p.platforms?.includes('server') ? 'your own server' : ''].filter(Boolean).join(' · '))}</span></div>` : ''}
          <div class="fact"><span>Kind</span><span>${esc(KIND[p.kind] ?? 'App')}</span></div>
          ${p.stars ? `<div class="fact"><span>Stars on GitHub</span><span>${fmtStars(p.stars)}</span></div>` : ''}
          <div class="fact"><span>Hosted on</span><span>${esc(host)}</span></div>
          <div class="fact"><span>Activity</span><span>${p.inactive ? 'No changes in over a year' : 'Changed within the last year'}</span></div>
        </div>
      </section>
      <section class="surface sec fold-phone">
        <div class="fold-head"><h2 class="h-large">Something wrong?</h2><p class="desc12" style="margin-top:4px">Wrong devices, a wrong description, or it isn't really open source? A mod reviews every suggestion.</p></div>
        <div class="stack">
          <a class="btn md secondary" href="${esc(suggestUrl('2-fix', { project: p.name }))}" rel="noopener">Suggest a fix</a>
          <a class="btn md secondary" href="${esc(suggestUrl('5-report', { project: p.name }))}" rel="noopener">Report this project</a>
        </div>
      </section>
      ${p.unconfirmed?.length ? `<section class="surface sec">
        <details class="fold">
          <summary><span class="h-large">What we couldn't confirm</span><span class="count">${p.unconfirmed.length}</span></summary>
          <ul class="unc">${p.unconfirmed.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>
        </details>
      </section>` : ''}
    </div>
  </div>`;

    const jsonLd = {
      '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: p.name, description: p.summary, url: `${SITE_URL}p/${p.id}/`,
      ...(p.license ? { license: p.license } : {}), ...(codeUrl(p) ? { codeRepository: codeUrl(p) } : {}), ...(p.website ? { sameAs: p.website } : {}),
      applicationCategory: listed[0]?.group.name,
    };
    return { path: `p/${p.id}/`, title: replaces.length ? `${p.name}: open-source alternative to ${replaces.slice(0, 2).join(' and ')}` : p.name, description, body, styles: ['group.css'], scripts: p.screenshots?.length ? ['gallery.js'] : [], jsonLd };
  });
}
