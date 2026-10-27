// Pieces more than one page draws: the alternative card (group pages and closed-app pages) and the address of a
// closed app's own page.
import { rankAlts } from './rank.mjs';
import { esc, url, ICON, KIND, SETUP, SETUP_MEANING, setupOf, setupWhy, devicesText, factChips, hostOf, actions, suggestUrl, SOCIAL, SITE_URL, codeUrl, shot as shotOf } from './lib.mjs';

// WHY its own address per closed app (Destin, Oct 27): people search "alternatives to Notion", not "Notes".
// "alternatives-to/notion/" reads well in a search result and stays stable when an app moves group.
export const appSlug = (name) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const appUrl = (name) => url(`alternatives-to/${appSlug(name)}/`);

const hostLabel = (p) => ({ 'github.com': 'GitHub', 'gitlab.com': 'GitLab', 'codeberg.org': 'Codeberg' }[hostOf(p)] ?? 'Own website');

// "Why it's here": a short, honest line built from the same points that decided the order (rank.mjs). Only reasons a
// visitor can check themselves are shown. WHY not the stars or the AI-written order: stars are on the card already, and
// the order was not written by people, so we don't present it as a reason. Community % only appears when real votes exist.
const WHY_SHOWN = ['Does the whole job', 'Does part of the job', 'Verified', 'Easy setup', 'Advanced setup', 'Archived', 'No recent activity', 'Runs on your device', "Doesn't run on your device"];
export const whyLine = (why = []) => [...why.filter((w) => /say it works$/.test(w.text)).map((w) => w.text), ...WHY_SHOWN.filter((t) => why.some((w) => w.text === t))]
  .join(' · ');

export function altCard(p, alt, i, group, why) {
  const whyText = whyLine(why);
  // WHY no kind in the foot any more: the setup chip says it in plain words.
  const foot = [hostLabel(p), alt.note].filter(Boolean).join(' · ');
  const acts = actions(p);
  const shot = shotOf(p);
  // WHY this layout (Destin chose option B, Oct 27): a screenshot on every card, framed like the app's
  // Marketplace theme previews, and one "Actions" menu instead of a row of buttons.
  // WHY a stretched title link: the card also holds the Actions menu, and links can't sit inside links.
  // WHY the menu id carries the group: a closed-app page can list the same project under two groups.
  const menuId = `act-${esc(p.id)}-${i}`;
  return `<div class="card pic" data-fit="${alt.fit}" data-stars="${p.stars ?? 0}" data-name="${esc(p.name.toLowerCase())}" data-order="${i}" data-setup="${setupOf(p)}" data-platforms="${esc((p.platforms ?? []).join(' '))}">
      ${shot ? `<div class="preview"><img src="${esc(shot)}" alt="${esc(p.name)} screenshot" loading="lazy" referrerpolicy="no-referrer"></div>` : '<div class="preview empty">No screenshot yet</div>'}
      <div class="inner">
        <div class="head"><h3><a class="cardlink" href="${url(`p/${p.id}/`)}">${esc(p.name)}</a></h3>
          ${acts.length ? `<div class="dd actions"><button class="btn sm secondary" type="button" data-menu="${menuId}" aria-haspopup="menu" aria-expanded="false">Actions ${ICON.chev}</button>
            <div class="menu" id="${menuId}" role="menu">${acts.map((l) => `<a class="mi" role="menuitem" href="${esc(l.href)}" rel="noopener">${l.label}</a>`).join('')}<a class="mi" role="menuitem" href="${url(`p/${p.id}/`)}">See full details</a><a class="mi" role="menuitem" href="${esc(suggestUrl('2-fix', { project: p.name, ...(group ? { group: group.name } : {}) }))}" rel="noopener">Suggest a change</a></div></div>` : ''}</div>
        <div class="chiprow">${factChips(p, alt, SOCIAL && group ? `<span class="chip" data-rating data-group="${group.id}" data-project="${esc(p.id)}" hidden></span>` : '')}</div>
        <p class="blurb">${esc(p.summary)}</p>
        ${whyText ? `<p class="why" title="Why it is listed where it is. Nobody has to have voted for this; it comes from the facts on the card.">Why it's here: ${esc(whyText)}</p>` : ''}
        <div class="foot">${esc(foot)}</div>
        ${SOCIAL && group ? `<div class="missing-count" data-missing-count data-group="${group.id}" data-project="${esc(p.id)}" hidden></div>` : ''}
      </div>
    </div>`;
}

// Best first: see rank.mjs for the points and why. WHY not just fit-then-stars (the old rule): stars are a weak, partly
// missing signal (30 projects off GitHub had 0 stars, so GIMP-class apps sank), and the editors' best-first order in
// the data file was thrown away. The caller's order IS the editors' order, so position is passed in as idx.
export const sortAlts = (alts) => rankAlts(alts.map((x, idx) => ({ ...x, idx })));

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
// "Help me choose": a prompt for visitors who want to pick one, not build one (Destin, Oct 26). The pasted list is in the
// SAME order as the page (alts comes from sortAlts), and carries the setup rating and devices so the AI can use them.
const SETUP_KEY = 'Setup rating: "Easy setup" means you can install it like a normal app, use it in a browser. "Advanced setup" means you must run it on your own server or use the command line, or it is a tool for developers.';
function choosePrompt({ closed, job, json, alts }) {
  return `I want to pick an open-source replacement for ${closed.join(', ')}${job ? ` (${job.toLowerCase()})` : ''}. Below is a list from Open Source Everything (CC BY-SA 4.0), in the order its website shows it. The order is a starting point, not a verdict.\n\n` +
    alts.map(({ p, a }) => `- ${p.name}: ${p.summary} [${SETUP[setupOf(p)]}${p.setupWhy ? ` (${p.setupWhy})` : ''}; ${devicesText(p) || (p.platforms?.includes('server') ? 'runs on a server you set up' : 'devices not listed')}; replaces ${a.fit === 'full' ? 'fully' : 'partly'}; ${p.license ?? 'license being checked'}${p.verified ? '; Verified by r/TrueOpenSource mods' : ''}${p.inactive ? '; no changes in over a year' : ''}${codeUrl(p) ? `; ${codeUrl(p)}` : p.website ? `; ${p.website}` : ''}]`).join('\n') +
    `\n\n${SETUP_KEY}\n\nFull details: ${SITE_URL}${json}\n\nBefore recommending anything, ask me these three questions (one at a time, in plain words): 1) Which device or devices will I use it on (Windows, Mac, Linux, Android, iPhone)? 2) How comfortable am I with technical setup: only installing apps from a store, happy to follow a step-by-step guide, or comfortable with servers and the command line? 3) What is my budget: free only, or willing to pay for hosting or support? Then recommend one to three projects from this list only, and for each say why, using how fully it replaces the app, its setup rating, and the devices it runs on. If nothing on the list fits me, say so plainly instead of stretching.`;
}
export function chooseBox(t) {
  return `<section class="surface sec fold-phone" id="choose">
        <h2 class="h-large fold-head">Help me choose</h2>
        <p class="small2">Not sure which one fits you? Paste this into any AI assistant. It asks about your device, your skill level and your budget, then picks from this list.</p>
        <div id="prompt-choose" hidden>${esc(choosePrompt(t))}</div>
        <div class="stack"><button class="btn md primary" type="button" data-copy="prompt-choose" data-copied="Copied, with the list. Paste it into any AI assistant.">Copy "Help me choose" prompt</button></div>
      </section>`;
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
