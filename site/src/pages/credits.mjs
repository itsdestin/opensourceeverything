// Credits (credits/): the data license and the free lists the map was first filled from.
// WHY read data/CREDITS.md: one source for the credits, so the page and the downloadable file never disagree.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { url, esc } from '../lib.mjs';

const md = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../data/CREDITS.md'), 'utf8');
// Rows of the markdown table: | [name](link) | license |
const rows = [...md.matchAll(/^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|\s*([^|]+?)\s*\|$/gm)].map((m) => ({ name: m[1], link: m[2], license: m[3] }));
const notices = md.split('\n').find((l) => l.includes('require their copyright notices')) ?? '';

export default function credits() {
  const body = `
  <div class="surface identity">
    <div><div class="muted11">Credits</div><h1 class="h-subject">Credits and data license</h1>
      <p class="desc12" style="margin-top:4px">Open Instead's data is free to reuse under CC BY-SA 4.0: give credit, and share your changes the same way.</p></div>
    <div class="btns-row"><a class="btn md secondary" href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener">Read the license</a><a class="btn md primary" href="${url('data/groups.json')}">Download the data</a></div>
  </div>
  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">Where the first listings came from</h2><p class="desc12">The map was filled in once, in October 2026, from these free lists. Thank you to everyone who maintains them.</p></div></div>
    <div class="lvl2 tablewrap"><table class="credits">
      <thead><tr><th>List</th><th>License</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td><a href="${esc(r.link)}" rel="noopener">${esc(r.name)}</a></td><td>${esc(r.license)}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="small2">${esc(notices)} Project descriptions were written for this map from each project's own README.</p>
  </section>`;
  return [{ path: 'credits/', title: 'Credits', styles: ['pages.css'], description: 'Open Instead\'s data license (CC BY-SA 4.0) and the free lists it was first filled from.', body }];
}
