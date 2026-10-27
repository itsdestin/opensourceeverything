// "This group was split" pages: one at each old group address (g/<old id>/) so old links, bookmarks and search results
// keep working after a group was divided into better-defined jobs (data/redirects.json, written by prefill/assemble.mjs).
// WHY a chooser and not an automatic jump: the old group held several jobs (calendars AND booking pages), so there is no
// single right place to send everyone; each choice is one click.
import { esc, url } from '../lib.mjs';

export default function moved(d) {
  // Old closed-app addresses (alternatives-to/<slug>/) that were merged, renamed or turned into a project.
  const apps = Object.entries(d.movedApps).map(([slug, to]) => ({
    path: `alternatives-to/${slug}/`, title: 'This page moved', noIndex: true, description: 'This page moved.', styles: ['pages.css'],
    body: `
  <div class="surface identity"><div><div class="muted11">Moved</div><h1 class="h-subject">This page moved</h1>
    <p class="desc12" style="margin-top:4px">The app was renamed, merged with another spelling, or turned out to be open source.</p></div></div>
  <section class="surface sec"><a class="btn md primary" href="${url(to)}">Go to the new page</a></section>`,
  }));
  return [...apps, ...Object.entries(d.moved).map(([oldId, newIds]) => {
    const targets = newIds.map((id) => d.groups.find((g) => g.id === id)).filter(Boolean);
    const list = targets.map((g) => `
      <a class="card gcard" href="${url(`g/${g.id}/`)}"><div class="head"><h3>${esc(g.name)}</h3></div>
        <p class="job">${esc(g.job)}.</p>${g.closed.length ? `<div class="foot">Replaces ${esc(g.closed.join(', '))}</div>` : '' /* WHY: no line when there's no paid rival (Destin, Oct 27) */}</a>`).join('');
    return {
      path: `g/${oldId}/`, title: 'This group was split', noIndex: true,
      description: 'This group was split into smaller groups. Pick the job you need.',
      body: `
  <div class="surface identity"><div><div class="muted11">Moved</div><h1 class="h-subject">This group was split</h1>
    <p class="desc12" style="margin-top:4px">It mixed different jobs, so each now has its own page. Pick the one you need.</p></div></div>
  <section class="surface sec"><div class="row1 fill list">${list}</div></section>`,
      styles: ['pages.css'],
    };
  })];
}
