// The search results page (search/?q=…): what pressing Enter in the search box opens.
// WHY its own page (Destin, Oct 26: "pressing enter … just opens jan. it should give a results list"): the dropdown
// is for jumping to something you already know; a full list, with how well each result matches and why, is for
// looking around. The list itself is drawn in the browser by assets/search-page.js, from the same ranking
// (assets/search-core.js) the dropdown uses.
import { DEVICE, ICON } from '../lib.mjs';

export default function searchPage() {
  const kinds = [['all', 'Everything'], ['project', 'Projects'], ['group', 'Groups'], ['closed', 'Closed apps']];
  const item = (attrs, label, extra = '') => `<button type="button" class="mi" role="option" ${attrs}><span>${label}</span>${extra}</button>`;
  const chk = `<span class="chk" aria-hidden="true">${ICON.check}</span>`;
  // WHY one wide search card (Destin, round 4): the search box and a Filter button at its right, results underneath. The Filter menu holds the
  // three filters; on a phone it is a full-width sheet that slides up from the bottom edge, with a handle.
  const body = `
  <div class="surface sres-bar">
    <div class="sres-input">${ICON.search}<input type="search" data-sres-input placeholder="Search a closed app or open project…" autocomplete="off" aria-label="Search" autofocus>
      <div class="dd"><button class="btn sm secondary sres-filterbtn" type="button" data-menu="fMenu" aria-haspopup="dialog" aria-expanded="false" data-sres-filterbtn>Filter<span class="fcount" data-fcount hidden></span>${ICON.chev}</button>
        <div class="menu fsheet" id="fMenu" role="dialog" aria-label="Filter results" data-sres-filters>
          <span class="handle" data-handle aria-hidden="true"></span>
          <div class="fgroup"><div class="label">Type</div>${kinds.map(([k, label], i) => `<button type="button" class="mi${i ? '' : ' sel'}" role="option" data-kind="${k}"><span>${label}</span><span class="muted11" data-count="${k}"></span></button>`).join('')}</div>
          <div class="fgroup"><div class="label">Works on</div>${Object.entries(DEVICE).map(([k, label]) => item(`aria-selected="false" data-device="${k}"`, label, chk)).join('')}</div>
          <div class="fgroup"><div class="label">Setup</div>${[['', 'Any'], ['easy', 'Easy setup'], ['advanced', 'Advanced setup']].map(([k, label], i) => `<button type="button" class="mi${i ? '' : ' sel'}" role="option" data-setupf="${k}"><span>${label}</span></button>`).join('')}</div>
          <button type="button" class="btn md secondary full fclear" data-clear="all">Clear filters</button>
        </div></div>
    </div>
    <p class="muted11" data-sres-sub></p>
  </div>
  <section class="surface sec">
    <div class="sres-list" data-sres-list><div class="empty">Loading…</div></div>
    <noscript><p class="desc12">Search needs JavaScript. Browse by <a href="./">category</a> instead.</p></noscript>
  </section>`;
  return [{
    path: 'search/', title: 'Search', noIndex: true, search: false, styles: ['pages.css'], scripts: ['search-page.js'], body,
    description: 'Search open-source replacements for closed apps, by name or by what you need.',
  }];
}
