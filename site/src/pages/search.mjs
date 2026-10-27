// The search results page (search/?q=…): what pressing Enter in the search box opens.
// WHY its own page (Destin, Oct 26: "pressing enter … just opens jan. it should give a results list"): the dropdown
// is for jumping to something you already know; a full list, with how well each result matches and why, is for
// looking around. The list itself is drawn in the browser by assets/search-page.js, from the same ranking
// (assets/search-core.js) the dropdown uses.
import { DEVICE } from '../lib.mjs';

export default function searchPage() {
  const kinds = [['all', 'Everything'], ['project', 'Open projects'], ['group', 'Groups'], ['closed', 'Closed apps']];
  const body = `
  <div class="surface identity sres-head">
    <div><div class="muted11">Search</div><h1 class="h-subject" data-sres-title>Search results</h1>
      <p class="desc12" data-sres-sub>Type what you're looking for in the search box above.</p></div>
    <div class="sres-filters" data-sres-filters hidden>
      <div class="fchips" role="group" aria-label="Show">${kinds.map(([k, label], i) => `<button type="button" class="fchip${i ? '' : ' sel'}" data-kind="${k}" aria-pressed="${i ? 'false' : 'true'}">${label}<span class="n" data-count="${k}"></span></button>`).join('')}</div>
      <div class="fchips" role="group" aria-label="Runs on">${Object.entries(DEVICE).map(([k, label]) => `<button type="button" class="fchip" data-device="${k}" aria-pressed="false">${label}</button>`).join('')}</div>
    </div>
  </div>
  <section class="surface sec">
    <div class="sres-list" data-sres-list><div class="empty">Loading…</div></div>
    <noscript><p class="desc12">Search needs JavaScript. Browse by <a href="./">category</a> instead.</p></noscript>
  </section>`;
  return [{
    path: 'search/', title: 'Search', noIndex: true, styles: ['pages.css'], scripts: ['search-page.js'], body,
    description: 'Search open-source replacements for closed apps, by name or by what you need.',
  }];
}
