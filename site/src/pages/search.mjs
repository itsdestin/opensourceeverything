// The search results page (search/?q=…): what pressing Enter in the search box opens.
// WHY its own page (Destin, Oct 26: "pressing enter … just opens jan. it should give a results list"): the dropdown
// is for jumping to something you already know; a full list, with how well each result matches and why, is for
// looking around. The list itself is drawn in the browser by assets/search-page.js, from the same ranking
// (assets/search-core.js) the dropdown uses.
import { DEVICE, ICON } from '../lib.mjs';

export default function searchPage() {
  const kinds = [['all', 'Everything'], ['project', 'Projects'], ['group', 'Groups'], ['closed', 'Closed apps']];
  // WHY (Destin, round 5): the result count sits INSIDE the search card, on the box's own line next to Filter, so there is no extra row for it.
  // The filter sheet follows the guide's Checkbox look for the pick-several list (Works on) and the Radio look for the pick-one lists (Type, Setup); each option shows its count at the right,
  // and the sheet's footer stays in view: Clear (outlined) and "Show N results" (filled).
  const radio = (attrs, label, on, count) => `<button type="button" class="mi opt rad${on ? ' sel' : ''}" role="radio" aria-checked="${on}" ${attrs}><span class="ctl" aria-hidden="true"></span><span class="ol">${label}</span><span class="muted11 oc" ${count}></span></button>`;
  const check = (attrs, label, count) => `<button type="button" class="mi opt chk" role="checkbox" aria-checked="false" ${attrs}><span class="ctl" aria-hidden="true">${ICON.check}</span><span class="ol">${label}</span><span class="muted11 oc" ${count}></span></button>`;
  const body = `
  <div class="surface sres-bar">
    <div class="sres-input">${ICON.search}<input type="search" data-sres-input placeholder="Search a closed app or open project…" autocomplete="off" aria-label="Search" autofocus>
      <div class="dd"><button class="btn sm secondary sres-filterbtn" type="button" data-menu="fMenu" aria-haspopup="dialog" aria-expanded="false" data-sres-filterbtn>Filter<span class="fcount" data-fcount hidden></span>${ICON.chev}</button>
        <div class="menu fsheet" id="fMenu" role="dialog" aria-label="Filter results" data-sres-filters>
          <span class="handle" data-handle aria-hidden="true"></span>
          <div class="fscroll">
            <div class="fgroup" role="radiogroup" aria-label="Type"><div class="label">Type</div>${kinds.map(([k, label], i) => radio(`data-kind="${k}"`, label, !i, `data-count="${k}"`)).join('')}</div>
            <div class="fgroup" role="group" aria-label="Works on"><div class="label">Works on</div>${Object.entries(DEVICE).map(([k, label]) => check(`data-device="${k}"`, label, `data-dcount="${k}"`)).join('')}</div>
            <div class="fgroup" role="radiogroup" aria-label="Setup"><div class="label">Setup</div>${[['', 'Any'], ['easy', 'Easy setup'], ['advanced', 'Advanced setup']].map(([k, label], i) => radio(`data-setupf="${k}"`, label, !i, `data-scount="${k}"`)).join('')}</div>
          </div>
          <div class="fsfoot"><button type="button" class="btn md secondary" data-clear="all">Clear</button><button type="button" class="btn md primary" data-fshow>Show results</button></div>
        </div></div>
    </div>
  </div>
  <section class="surface sec">
    <div class="sec-head"><div><h2 class="h-large">Results</h2><p class="desc12" data-sres-sub aria-live="polite"></p></div></div>
    <div class="sres-list" data-sres-list><div class="empty">Loading…</div></div>
    <noscript><p class="desc12">Search needs JavaScript. Browse by <a href="./">category</a> instead.</p></noscript>
  </section>`;
  return [{
    path: 'search/', title: 'Search', noIndex: true, search: false, styles: ['pages.css'], scripts: ['search-page.js'], body,
    description: 'Search open-source replacements for closed apps, by name or by what you need.',
  }];
}
