// Discussion boards (Destin, Oct 27): boards/ (most wanted across the map, and every category's board),
// c/<id>/board/ (one category), n/ (one note, by ?id=) and mod/ (mod tools). The pages are empty frames;
// assets/social.js fills them from the server. Built only when there's a server (SOCIAL).
import { esc, url, SOCIAL } from '../lib.mjs';

export default function boardPages(d) {
  if (!SOCIAL) return [];
  const addBtn = (attrs, label = 'Add a note') => `<button class="btn md primary" type="button" data-add-note ${attrs}>${label}</button>`;
  const intro = `<p class="desc12" style="margin-top:4px">Most upvoted first.</p>`;
  const index = {
    path: 'boards/', title: 'Boards', styles: ['pages.css', 'group.css'],
    description: "What's missing from open-source apps, and what people wish existed, voted on by the r/TrueOpenSource community.",
    body: `
  <div class="surface identity"><div class="row"><div><div class="muted11">Boards</div><h1 class="h-subject">What people want next</h1></div>${addBtn('')}</div></div>
  <div class="cols"><div>
    <section class="surface sec"><div class="sec-head"><div><h2 class="h-large">Most wanted</h2></div></div>
      <div data-board></div></section></div>
    <div><section class="surface sec"><h2 class="h-large">Boards by category</h2><div class="stack">${d.categories.map((c) => `<a class="btn md secondary" href="${url(`c/${c.id}/board/`)}">${esc(c.name)}</a>`).join('')}</div></section></div>
  </div>`,
  };
  const cats = d.categories.map((c) => ({
    path: `c/${c.id}/board/`, title: `${c.name} board`, styles: ['pages.css', 'group.css'],
    description: `What's missing from open-source ${c.name.toLowerCase()} apps, and what people wish existed.`,
    body: `
  <div class="surface identity"><div class="row"><div><div class="muted11"><a class="crumb" href="${url('boards/')}">Boards</a> · <a class="crumb" href="${url(`c/${c.id}/`)}">${esc(c.name)}</a></div><h1 class="h-subject">${esc(c.name)} board</h1>${intro}</div>${addBtn(`data-category="${c.id}"`)}</div></div>
  <section class="surface sec"><div data-board data-category="${c.id}"></div></section>`,
  }));
  return [index, ...cats,
    { path: 'n/', title: 'Note', noIndex: true, styles: ['pages.css', 'group.css'], description: 'A note on Open Source Everything.', body: '<div data-note-page><div class="surface sec"><div class="empty">Loading…</div></div></div>' },
    { path: 'mod/', title: 'Mod tools', noIndex: true, styles: ['pages.css', 'group.css'], description: 'Mod tools.', // WHY tabs (review Oct 26): the page holds posts waiting for approval; suggestions and developer pitches are a second tab (assets/contrib.js).
      body: '<div class="surface tabs-bar" data-mod-tabs hidden></div><div data-mod><div class="surface sec"><div class="empty">Loading…</div></div></div><div data-mod-suggest hidden></div>' }];
}
