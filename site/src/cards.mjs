// Pieces more than one page draws: the alternative card (group pages and closed-app pages) and the address of a
// closed app's own page.
import { esc, url, ICON, KIND, factChips, hostOf, actions, suggestUrl, SOCIAL, SITE_URL, codeUrl, shot as shotOf } from './lib.mjs';

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
        <div class="foot">${esc(foot)}</div>
        ${SOCIAL && group ? `<div class="missing-count" data-missing-count data-group="${group.id}" data-project="${esc(p.id)}" hidden></div>` : ''}
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

// "Before you build": a prompt to paste into any AI assistant, on group pages and closed-app pages.
// WHY on both (Destin, Oct 27: "where'd our copyable prompts go?"): search and the home page now lead to closed-app
// pages, so the prompt has to be there too, not only on group pages.
function promptText({ closed, job, json, alts }, full) {
  const ask = 'Compare it with my project or idea below. Tell me which projects overlap, what I could reuse instead of rewriting, and what mine does that none of them do.';
  if (!full) return `Read the list of open-source alternatives at ${SITE_URL}${json}. ${ask}\n\nMy project or idea:\n`;
  return `Here is a list of open-source alternatives to ${closed.join(', ')}${job ? ` (${job.toLowerCase()})` : ''}, from Open Source Everything (CC BY-SA 4.0):\n` +
    alts.map(({ p, a }) => `- ${p.name} (${p.license ?? 'license being checked'}${codeUrl(p) ? `, ${codeUrl(p)}` : p.website ? `, ${p.website}` : ''}; replaces ${a.fit === 'full' ? 'fully' : 'partly'}): ${p.summary}`).join('\n') +
    `\n\n${ask}\n\nMy project or idea:\n`;
}
export function buildBox(t) {
  return `<section class="surface sec fold-phone" id="build">
        <h2 class="h-large fold-head">Before you build</h2>
        <p class="small2">Planning something for ${esc(t.about)}? See what exists first, so you can reuse parts or explain what's different. Paste this into any AI assistant:</p>
        <div class="lvl2 prompt" id="prompt-short">${esc(promptText(t, false))}</div>
        <div id="prompt-full" hidden>${esc(promptText(t, true))}</div>
        <div class="stack">
          <button class="btn md primary" type="button" data-copy="prompt-short" data-copied="Copied. Paste it into any AI assistant.">Copy prompt</button>
          <button class="btn md secondary" type="button" data-copy="prompt-full" data-copied="Copied, with the list. Paste it into any AI assistant.">Copy with the list included</button>
          <a class="btn md secondary" href="${url(t.json)}" download>Download the list</a>
        </div>
      </section>`;
}
