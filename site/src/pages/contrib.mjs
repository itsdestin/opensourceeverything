// Pages for contributions (review Oct 26): tag/ (Tag my project) and suggestions/ (Your suggestions).
// Empty frames: assets/contrib.js fills them from the server, so they exist only when there is one (SOCIAL).
import { SOCIAL } from '../lib.mjs';

export default function contribPages() {
  if (!SOCIAL) return [];
  return [
    { path: 'tag/', title: 'Tag my project', noIndex: true, styles: ['pages.css', 'group.css'],
      description: 'Tell people what your open-source project does differently. Shown on its page as From the Developer.',
      body: '<div data-tag><div class="surface sec"><div class="empty">Loading…</div></div></div>' },
    { path: 'suggestions/', title: 'Your suggestions', noIndex: true, styles: ['pages.css', 'group.css'],
      description: 'Where each of your suggestions stands: waiting, approved, live or turned down.',
      body: `<div class="surface identity"><div class="row"><div><div class="muted11">Your account</div><h1 class="h-subject">Your suggestions</h1></div></div></div>
        <div data-my-suggestions><div class="surface sec"><div class="empty">Loading…</div></div></div>` },
  ];
}
