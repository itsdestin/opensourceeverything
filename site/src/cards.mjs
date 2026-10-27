// Pieces more than one page draws: the alternative card (group pages and closed-app pages) and the address of a
// closed app's own page.
import { rankAlts } from './rank.mjs';
import { currentFamily, famGrey, famNodes } from './family.mjs';
import { cardAttrs, cardFold } from './surfaces.mjs'; // feature checklists + AI label (surfaces.mjs)
import { esc, url, ICON, KIND, SETUP, SETUP_MEANING, setupOf, setupWhy, devicesText, factChips, hostOf, actions, suggestUrl, SOCIAL, SITE_URL, codeUrl, fmtStars, shot as shotOf } from './lib.mjs';

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


// ───────── The alternative card (Destin picked option a in the redesign round) ─────────
// WHY this shape: a screenshot band, then name with its (i) and Actions at the top right, ONE chip row that scrolls sideways (stars first,
// setup an ordinary chip that explains itself), a two-line description and at most one grey line about the family. On phones it becomes a
// short row (CSS) so a screen shows five or six projects instead of one and a half.
const tipChip = (id, html, title) => `<button class="chip tipchip" type="button" data-tip="${id}" aria-expanded="false" aria-label="${esc(title)}">${html}</button>`;
const tpl = (id, title, html) => `<template data-for="${id}" data-title="${esc(title)}">${html}</template>`;
export function altCard(p, alt, i, group, why) {
  const fam = currentFamily();
  const gh = hostOf(p) === 'github.com';
  const shot = shotOf(p); const acts = actions(p);
  // WHY the menu id carries the group: a closed-app page can list the same project under two groups.
  const menuId = `act-${esc(p.id)}-${i}`;
  const grey = fam ? famGrey(p, fam) : '';
  const nodes = fam ? famNodes(p, fam) : [];
  // WHY only the facts no chip shows (Destin: the pop-up must not restate the chips): how fully it replaces the app, and people's votes.
  const whyText = whyLine(why).split(' · ').filter((w) => /^Does (the whole|part of the) job$|say it works$/.test(w)).join(' · ');
  // Chips: stars FIRST when present (Destin), then setup as an ordinary chip that explains itself on click.
  const chips = [
    p.stars ? tipChip('stars', `${ICON.star}${fmtStars(p.stars)}`, 'About GitHub stars') : (!gh ? '<span class="chip">Not on GitHub</span>' : ''),
    tipChip('setup', SETUP[setupOf(p)], 'What this setup rating means'),
    SOCIAL && group ? `<span class="chip" data-rating data-group="${group.id}" data-project="${esc(p.id)}" hidden></span>` : '',
    tipChip('active', p.inactive ? 'Quiet for a year' : 'Active', 'What this activity label means'),
    devicesText(p) ? `<span class="chip">${esc(devicesText(p))}</span>` : '',
    p.verified ? tipChip('verified', `${ICON.shield}Verified`, 'What Verified means') : '',
    `<span class="chip">${esc(p.license ?? 'License being checked')}</span>`,
    alt.fit === 'partial' ? `<span class="chip" title="${esc(alt.note || 'Covers part of the job')}">Replaces partly</span>` : '',
  ].filter(Boolean).join('');
  const pageLink = url(`p/${p.id}/`);
  const famHtml = nodes.length ? `<ul class="tiplist">${nodes.slice(0, 7).map((n) => `<li class="d${n.depth}">${n.outside ? esc(n.name) : n.here ? `<b>${esc(n.p.name)}</b>` : `<a href="${url(`p/${n.p.id}/`)}">${esc(n.p.name)}</a>`}<span>${esc(n.rel || n.status.text)}</span></li>`).join('')}</ul><a class="tipmore" href="${pageLink}#family">See the whole family</a>` : '';
  const tips = [
    tpl('stars', 'GitHub stars', '<p>How many people bookmarked its code on GitHub. It shows how popular it is, not how good it is or how well it replaces the app.</p>'),
    tpl('setup', SETUP[setupOf(p)], `<p>How hard it is to start using it. <b>Easy</b>: install it like a normal app, or use it in your browser. <b>Advanced</b>: you run it on your own server, use the command line, or it is a tool for developers.</p>`),
    tpl('active', p.inactive ? 'Quiet for a year' : 'Active', `<p>${p.inactive ? 'Nobody has changed its code in over a year. It may still work well, but help is less likely.' : 'Its code changed within the last year, so someone is still looking after it.'}</p>`),
    p.verified ? tpl('verified', 'Verified', '<p>r/TrueOpenSource mods checked it: an open-source license, still looked after, and it really does the job.</p>') : '',
    tpl('why', 'Why it is listed here', `${whyText ? `<p>${esc(whyText.split(' · ').join(', '))}.</p>` : ''}<p class="tipwhy">Ordered by how fully it replaces the app, Verified, setup and, when there are enough, people's votes.</p>${famHtml}`),
  ].join('');
  return `<div class="card pic" data-fit="${alt.fit}" data-project="${esc(p.id)}" data-stars="${p.stars ?? 0}" data-name="${esc(p.name.toLowerCase())}" data-order="${i}"${cardAttrs(p, group)} data-setup="${setupOf(p)}" data-platforms="${esc((p.platforms ?? []).join(' '))}">
    <div class="rvbox" data-tipscope>
      <div class="rv-thumb">${shot ? `<img src="${esc(shot)}" alt="${esc(p.name)} screenshot" loading="lazy" referrerpolicy="no-referrer">` : '<span class="nopic">No screenshot yet</span>'}</div>
      <div class="rv-main">
        <div class="rv-head"><h3><a class="cardlink" href="${pageLink}">${esc(p.name)}</a></h3>
          <button class="whybtn" type="button" data-tip="why" aria-expanded="false" aria-label="Why it is listed here"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button>
          ${acts.length ? `<div class="dd actions"><button class="btn sm secondary" type="button" data-menu="${menuId}" aria-haspopup="menu" aria-expanded="false">More ${ICON.chev}</button>
            <div class="menu" id="${menuId}" role="menu">${acts.map((l) => `<a class="mi" role="menuitem" href="${esc(l.href)}" rel="noopener">${l.label}</a>`).join('')}<a class="mi" role="menuitem" href="${pageLink}">See full details</a>${p.help ? `<a class="mi" role="menuitem" href="${url(`p/${p.id}/#help`)}">How to help</a>` : ''}<a class="mi" role="menuitem" href="${esc(suggestUrl('2-fix', { project: p.name, ...(group ? { group: group.name } : {}) }))}" rel="noopener">Suggest a change</a></div></div>` : ''}</div>
        <div class="chiprow">${chips}</div>
        <p class="blurb">${esc(p.summary)}</p>
        ${cardFold(p, group)}
        ${SOCIAL ? `<div class="dev-pitch" data-dev-pitch data-mode="card" data-project="${esc(p.id)}" hidden></div>` : ''}
        ${grey ? `<p class="gl">${esc(grey)}</p>` : ''}
      </div>${tips}</div></div>`;
}

// Best first: see rank.mjs for the points and why. WHY not just fit-then-stars (the old rule): stars are a weak, partly
// missing signal (30 projects off GitHub had 0 stars, so GIMP-class apps sank), and the editors' best-first order in
// the data file was thrown away. The caller's order IS the editors' order, so position is passed in as idx.
export const sortAlts = (alts) => rankAlts(alts.map((x, idx) => ({ ...x, idx })));

// The "Works on" filter above a list of alternative cards; group.js hides the cards that don't match.
// WHY "No server needed": most of the map runs on your own server, which a newcomer can't use.
export const FILTERS = [['', 'All devices'], ['noserver', 'No server needed'], ['windows', 'Windows'], ['mac', 'Mac'], ['linux', 'Linux'], ['android', 'Android'], ['ios', 'iPhone'], ['web', 'In your browser']];
export const deviceFilter = (id) => `<div class="dd"><button class="select sm" type="button" data-menu="${id}" aria-haspopup="listbox" aria-expanded="false"><span data-device-label>All devices</span>${ICON.chev}</button>
  <div class="menu" id="${id}" role="listbox">${FILTERS.map(([k, v], i) => `<button class="mi${i ? '' : ' sel'}" type="button" role="option" data-device="${k}">${v}</button>`).join('')}</div></div>`;

// "Before you build": a prompt to paste into any AI assistant, on group pages and closed-app pages.
// WHY on both (Destin, Oct 27: "where'd our copyable prompts go?"): search and the home page now lead to closed-app
// pages, so the prompt has to be there too, not only on group pages.
// WHY (taxonomy-v2, Oct 27): some groups have no paid rival (game mods, the kernel, agent memory). Their prompts name the job instead of
// "alternatives to <nothing>".
const subject = (closed, job) => (closed.length ? `open-source alternatives to ${closed.join(', ')}${job ? ` (${job.toLowerCase()})` : ''}` : `open-source projects for ${(job ?? '').toLowerCase()}`);
function promptText({ closed, job, json, alts }, full) {
  const ask = 'Compare it with my project or idea below. Tell me which projects overlap, what I could reuse instead of rewriting, and what mine does that none of them do.';
  if (!full) return `Read the list of open-source projects at ${SITE_URL}${json}. ${ask}\n\nMy project or idea:\n`;
  return `Here is a list of ${subject(closed, job)}, from Open Source Everything (CC BY-SA 4.0):\n` +
    alts.map(({ p, a }) => `- ${p.name} (${p.license ?? 'license being checked'}${codeUrl(p) ? `, ${codeUrl(p)}` : p.website ? `, ${p.website}` : ''}; replaces ${a.fit === 'full' ? 'fully' : 'partly'}): ${p.summary}`).join('\n') +
    `\n\n${ask}\n\nMy project or idea:\n`;
}
// "Help me choose": a prompt for visitors who want to pick one, not build one (Destin, Oct 26). The pasted list is in the
// SAME order as the page (alts comes from sortAlts), and carries the setup rating and devices so the AI can use them.
const SETUP_KEY = 'Setup rating: "Easy setup" means you can install it like a normal app, use it in a browser. "Advanced setup" means you must run it on your own server or use the command line, or it is a tool for developers.';
function choosePrompt({ closed, job, json, alts }) {
  return `I want to pick ${closed.length ? `an open-source replacement for ${closed.join(', ')}${job ? ` (${job.toLowerCase()})` : ''}` : `an open-source project for ${(job ?? '').toLowerCase()}`}. Below is a list from Open Source Everything (CC BY-SA 4.0), in the order its website shows it. The order is a starting point, not a verdict.\n\n` +
    alts.map(({ p, a }) => `- ${p.name}: ${p.summary} [${SETUP[setupOf(p)]}${p.setupWhy ? ` (${p.setupWhy})` : ''}; ${devicesText(p) || (p.platforms?.includes('server') ? 'runs on a server you set up' : 'devices not listed')}; replaces ${a.fit === 'full' ? 'fully' : 'partly'}; ${p.license ?? 'license being checked'}${p.verified ? '; Verified by r/TrueOpenSource mods' : ''}${p.inactive ? '; no changes in over a year' : ''}${codeUrl(p) ? `; ${codeUrl(p)}` : p.website ? `; ${p.website}` : ''}]`).join('\n') +
    `\n\n${SETUP_KEY}\n\nFull details: ${SITE_URL}${json}\n\nBefore recommending anything, ask me these three questions (one at a time, in plain words): 1) Which device or devices will I use it on (Windows, Mac, Linux, Android, iPhone)? 2) How comfortable am I with technical setup: only installing apps from a store, happy to follow a step-by-step guide, or comfortable with servers and the command line? 3) What is my budget: free only, or willing to pay for hosting or support? Then recommend one to three projects from this list only, and for each say why, using how fully it replaces the app, its setup rating, and the devices it runs on. If nothing on the list fits me, say so plainly instead of stretching.`;
}
// WHY one filled button per view (reviewer, round 5): "Help me choose" is the filled one; "Before you build" is outlined (it is for the smaller group of people building something).
// Each is a heading and its button(s): the heading says what it does, so there is no helper line under it.
export function chooseBox(t) {
  return `<section class="surface sec fold-phone" id="choose">
        <h2 class="h-large fold-head">Help me choose</h2>
        <div id="prompt-choose" hidden>${esc(choosePrompt(t))}</div>
        <div class="stack"><button class="btn md primary" type="button" data-copy="prompt-choose" data-copied="Copied.">Copy AI prompt</button></div>
      </section>`;
}
export function buildBox(t) {
  return `<section class="surface sec fold-phone" id="build">
        <h2 class="h-large fold-head">Before you build</h2>
        <div id="prompt-short" hidden>${esc(promptText(t, false))}</div>
        <div class="stack">
          <button class="btn md secondary" type="button" data-copy="prompt-short" data-copied="Copied.">Copy AI prompt</button>
          <a class="btn md secondary" href="${url(t.json)}" download>Download the list</a>
        </div>
      </section>`;
}
