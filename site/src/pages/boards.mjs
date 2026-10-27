// Mod tools only. The free-text boards (boards/, c/<id>/board/, n/) were removed in round 4 (Destin approved): the server keeps its data untouched,
// the site just stops showing and taking notes. Short comments attached to actions come later.
// The mod page is still built (assets/social.js fills it from the server). Built only when there's a server (SOCIAL).
import { SOCIAL } from '../lib.mjs';

export default function boardPages() {
  if (!SOCIAL) return [];
  return [
    { path: 'mod/', title: 'Mod tools', noIndex: true, styles: ['pages.css', 'group.css'], description: 'Mod tools.', // WHY tabs (review Oct 26): the page holds posts waiting for approval; suggestions and developer pitches are a second tab
      body: '<div class="surface tabs-bar" data-mod-tabs hidden></div><div data-mod><div class="surface sec"><div class="empty">Loading…</div></div></div><div data-mod-suggest hidden></div>' }];
}
