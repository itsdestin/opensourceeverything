// Mod tools only. The free-text boards (boards/, c/<id>/board/, n/) were removed in round 4 (Destin approved): the server keeps its data untouched,
// the site just stops showing and taking notes. Short comments attached to actions come later.
// The mod page is still built (assets/social.js fills it from the server). Built only when there's a server (SOCIAL).
import { SOCIAL, url } from '../lib.mjs';

// WHY forwarders: the boards were live briefly, so boards/ links may be bookmarked or shared on Reddit; send them to the
// gaps page (what people want built now lives there) instead of a "not found" page.
const forward = (path) => {
  const target = url('gaps/');
  return { path, title: 'Moved to Gaps', noIndex: true, description: 'The boards moved to the Gaps page.',
    body: `<section class="surface sec"><p class="body2">The boards moved. Taking you to <a href="${target}">Gaps</a>…</p><script>location.replace(${JSON.stringify(target)});</script></section>` };
};

export default function boardPages(d) {
  const moved = [forward('boards/'), ...d.categories.map((c) => forward(`c/${c.id}/board/`))];
  if (!SOCIAL) return moved;
  return [...moved,
    { path: 'mod/', title: 'Mod tools', noIndex: true, styles: ['pages.css', 'group.css'], description: 'Mod tools.', // WHY tabs (review Oct 26): the page holds posts waiting for approval; suggestions and developer pitches are a second tab
      body: '<div class="surface tabs-bar" data-mod-tabs hidden></div><div data-mod><div class="surface sec"><div class="empty">Loading…</div></div></div><div data-mod-suggest hidden></div>' }];
}
