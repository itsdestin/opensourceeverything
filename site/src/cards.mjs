// Pieces more than one page draws: the alternative card (group pages and closed-app pages) and the address of a
// closed app's own page.
import { esc, url, ICON, KIND, factChips, hostOf, actions, suggestUrl, SOCIAL, shot as shotOf } from './lib.mjs';

// WHY its own address per closed app (Destin, Oct 27): people search "alternatives to Notion", not "Notes".
// "alternatives-to/notion/" reads well in a search result and stays stable when an app moves group.
export const appSlug = (name) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const appUrl = (name) => url(`alternatives-to/${appSlug(name)}/`);

const hostLabel = (p) => ({ 'github.com': 'GitHub', 'gitlab.com': 'GitLab', 'codeberg.org': 'Codeberg' }[hostOf(p)] ?? 'Own website');

export function altCard(p, alt, i, group) {
  const foot = [KIND[p.kind], hostLabel(p), alt.note].filter(Boolean).join(' · ');
  const acts = actions(p);
  const shot = shotOf(p);
  // WHY this layout (Destin chose option B, Oct 27): a screenshot on every card, framed like the app's
  // Marketplace theme previews, and one "Actions" menu instead of a row of buttons.
  // WHY a stretched title link: the card also holds the Actions menu, and links can't sit inside links.
  // WHY the menu id carries the group: a closed-app page can list the same project under two groups.
  const menuId = `act-${esc(p.id)}-${i}`;
  return `<div class="card pic" data-fit="${alt.fit}" data-stars="${p.stars ?? 0}" data-name="${esc(p.name.toLowerCase())}" data-order="${i}" data-platforms="${esc((p.platforms ?? []).join(' '))}">
      ${shot ? `<div class="preview"><img src="${esc(shot)}" alt="${esc(p.name)} screenshot" loading="lazy" referrerpolicy="no-referrer"></div>` : '<div class="preview empty">No screenshot yet</div>'}
      <div class="inner">
        <div class="head"><h3><a class="cardlink" href="${url(`p/${p.id}/`)}">${esc(p.name)}</a></h3>
          ${acts.length ? `<div class="dd actions"><button class="btn sm secondary" type="button" data-menu="${menuId}" aria-haspopup="menu" aria-expanded="false">Actions ${ICON.chev}</button>
            <div class="menu" id="${menuId}" role="menu">${acts.map((l) => `<a class="mi" role="menuitem" href="${esc(l.href)}" rel="noopener">${l.label}</a>`).join('')}<a class="mi" role="menuitem" href="${url(`p/${p.id}/`)}">See full details</a><a class="mi" role="menuitem" href="${esc(suggestUrl('2-fix', { project: p.name, ...(group ? { group: group.name } : {}) }))}" rel="noopener">Suggest a change</a></div></div>` : ''}</div>
        <div class="chiprow">${factChips(p, alt, SOCIAL && group ? `<span class="chip" data-rating data-group="${group.id}" data-project="${esc(p.id)}" hidden></span>` : '')}</div>
        <p class="blurb">${esc(p.summary)}</p>
        <div class="foot">${esc(foot)}${SOCIAL && group ? ` <span class="missing-count" data-missing-count data-group="${group.id}" data-project="${esc(p.id)}" hidden></span>` : ''}</div>
      </div>
    </div>`;
}

// Whole-job replacements first, then by GitHub stars as a rough popularity signal.
export const sortAlts = (alts) => alts.sort((x, y) => (x.a.fit === y.a.fit ? 0 : x.a.fit === 'full' ? -1 : 1) || (y.p.stars ?? 0) - (x.p.stars ?? 0));

// The "Works on" filter above a list of alternative cards; group.js hides the cards that don't match.
// WHY "No server needed": most of the map runs on your own server, which a newcomer can't use.
const FILTERS = [['', 'Any device'], ['noserver', 'No server needed'], ['windows', 'Windows'], ['mac', 'Mac'], ['linux', 'Linux'], ['android', 'Android'], ['ios', 'iPhone'], ['web', 'In your browser']];
export const deviceFilter = (id) => `<div class="dd"><button class="select sm" type="button" data-menu="${id}" aria-haspopup="listbox" aria-expanded="false"><span data-device-label>Works on: any device</span>${ICON.chev}</button>
  <div class="menu" id="${id}" role="listbox">${FILTERS.map(([k, v], i) => `<button class="mi${i ? '' : ' sel'}" type="button" role="option" data-device="${k}">${v}</button>`).join('')}</div></div>`;
