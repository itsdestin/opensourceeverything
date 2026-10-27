// The search results page (search/?q=…): what pressing Enter in the search box opens.
// WHY its own page (Destin, Oct 26: "pressing enter … just opens jan. it should give a results list"): the dropdown
// is for jumping to something you already know; a full list, with how well each result matches and why, is for
// looking around. The list itself is drawn in the browser by assets/search-page.js, from the same ranking
// (assets/search-core.js) the dropdown uses.
import { DEVICE, ICON } from '../lib.mjs';

export default function searchPage() {
  const kinds = [['all', 'Everything'], ['project', 'Projects'], ['group', 'Groups'], ['closed', 'Closed apps']];
  const body = `
  <div class="surface identity sres-head">
    <div><div class="muted11">Search</div><h1 class="h-subject" data-sres-title>Search results</h1>
      <p class="desc12" data-sres-sub></p></div>
    <div class="sres-filters" data-sres-filters hidden>
      <!-- WHY menus, not rows of chips (Destin: "these filter chips suck"): three short drop-downs; Works on takes several choices and stays open while you tick. -->
      <div class="dd"><button class="select sm" type="button" data-menu="fType" aria-haspopup="listbox" aria-expanded="false"><span data-flabel="type">Type</span>${ICON.chev}</button>
        <div class="menu left" id="fType" role="listbox">${kinds.map(([k, label], i) => `<button type="button" class="mi${i ? '' : ' sel'}" role="option" data-kind="${k}"><span>${label}</span><span class="muted11" data-count="${k}"></span></button>`).join('')}</div></div>
      <div class="dd"><button class="select sm" type="button" data-menu="fDev" aria-haspopup="listbox" aria-expanded="false"><span data-flabel="dev">Works on</span>${ICON.chev}</button>
        <div class="menu left" id="fDev" role="listbox" aria-multiselectable="true">${Object.entries(DEVICE).map(([k, label]) => `<button type="button" class="mi" role="option" aria-selected="false" data-device="${k}"><span>${label}</span><span class="chk" aria-hidden="true">${ICON.check}</span></button>`).join('')}<div class="menu-sep"></div><button type="button" class="mi" data-clear="dev"><span>Clear</span></button></div></div>
      <div class="dd"><button class="select sm" type="button" data-menu="fSetup" aria-haspopup="listbox" aria-expanded="false"><span data-flabel="setup">Setup</span>${ICON.chev}</button>
        <div class="menu left" id="fSetup" role="listbox">${[['', 'Any'], ['easy', 'Easy setup'], ['advanced', 'Advanced setup']].map(([k, label], i) => `<button type="button" class="mi${i ? '' : ' sel'}" role="option" data-setupf="${k}"><span>${label}</span></button>`).join('')}</div></div>
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
