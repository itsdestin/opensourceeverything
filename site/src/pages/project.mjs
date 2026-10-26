// One page per open-source project (p/<id>/): what it is, which groups it's listed in, and its facts.
import { esc, url, SITE_URL, KIND, factChips, hostOf, fmtStars, actions, codeUrl } from '../lib.mjs';

const HOSTS = { 'github.com': 'GitHub', 'gitlab.com': 'GitLab', 'codeberg.org': 'Codeberg' };

export default function projectPages(d) {
  return d.projects.map((p) => {
    const listed = d.groupsByProject.get(p.id) ?? [];
    const host = HOSTS[hostOf(p)] ?? (p.code ? hostOf(p) : 'Its own website');
    // WHY reversed: YouCoded's design guide puts the filled main button on the right, outlined ones to its left.
    const links = actions(p).map((l, i) => `<a class="btn md ${i ? 'secondary' : 'primary'}" href="${esc(l.href)}" rel="noopener">${l.label}</a>`).reverse().join('');
    const replaces = [...new Set(listed.flatMap(({ group }) => group.closed.slice(0, 3)))];
    const description = `${p.name}: ${p.summary}`.slice(0, 300);

    const body = `
  <div class="surface identity">
    <div class="row">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><h1 class="h-subject">${esc(p.name)}</h1></div>
    </div>
    <div class="chiprow">${factChips(p)}</div>
    <p class="body2">${esc(p.summary)}</p>
    <div class="idfoot"><p class="muted11">Description written from the project's own page; checked by AI.</p>${links ? `<div class="links">${links}</div>` : ''}</div>
  </div>

  <div class="cols">
    <div>
  ${p.screenshots?.length ? `<section class="surface sec">
        <div class="sec-head"><div><h2 class="h-large">Screenshots<span class="count">${p.screenshots.length}</span></h2><p class="desc12">From ${esc(p.name)}'s own page. Click one to see it full size.</p></div></div>
        <!-- WHY small thumbnails (Destin, Oct 27: full-size pictures were "overwhelming"); full size opens in a viewer. -->
        <div class="thumbstrip">${p.screenshots.map((u, i) => `<button class="thumb" type="button" data-shot="${esc(u)}" aria-label="Screenshot ${i + 1} of ${p.screenshots.length}, full size"><img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>`).join('')}</div>
      </section>` : ''}
      <section class="surface sec">
        <div class="sec-head"><div><h2 class="h-large">Listed in<span class="count">${listed.length}</span></h2><p class="desc12">The jobs it does, and the closed apps it replaces</p></div></div>
        <div class="stack">${listed.map(({ group, alt }) => `
          <a class="card listing" href="${url(`g/${group.id}/`)}">
            <div class="head"><h3>${esc(group.name)}</h3><span class="pill ${alt.fit === 'full' ? 'ok' : 'info'}">${alt.fit === 'full' ? '<i></i>Replaces fully' : 'Replaces partly'}</span></div>
            <p class="small2">Instead of ${esc(group.closed.join(', '))}${alt.note ? ` · ${esc(alt.note)}` : ''}</p>
          </a>`).join('')}
        </div>
      </section>
    </div>
    <div>
      <section class="surface sec">
        <h2 class="h-large">Facts</h2>
        <div class="lvl1 facts">
          <div class="fact"><span>License</span><span>${esc(p.license ?? 'Being checked')}</span></div>
          ${p.licenseNeedsCheck ? '<div class="fact"><span></span><span class="muted11">A mod is confirming this license</span></div>' : ''}
          ${p.licenseClass === 'open_core' ? '<div class="fact"><span>Paid parts</span><span>Open core: some parts paid</span></div>' : ''}
          <div class="fact"><span>Kind</span><span>${esc(KIND[p.kind] ?? 'App')}</span></div>
          ${p.stars ? `<div class="fact"><span>GitHub stars</span><span>${fmtStars(p.stars)}</span></div>` : ''}
          <div class="fact"><span>Hosted on</span><span>${esc(host)}</span></div>
          <div class="fact"><span>Activity</span><span>${p.inactive ? 'No changes in over a year' : 'Changed within the last year'}</span></div>
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
