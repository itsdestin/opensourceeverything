// The empty "Most thumbs-up from people here" strip on a group (or closed-app) page. It stays hidden: assets/social.js
// fills and shows it only once people have answered "Does it do the job?" at least 10 times across this group's
// alternatives. Only built when there's a server (SOCIAL), because the answers live there.
import { SOCIAL } from './lib.mjs';
import { esc } from './lib.mjs';

export const likedBox = (g, alts) => (SOCIAL && alts.length > 1
  ? `<div class="liked" data-liked data-group="${esc(g.id)}" data-alts="${esc(JSON.stringify(alts.map((x) => [x.p.id, x.p.name])))}" hidden></div>` : '');
