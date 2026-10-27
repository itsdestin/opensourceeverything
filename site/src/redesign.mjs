// Redesign round (preview builds only, REDESIGN=1): the pieces of the project page's new top card and family.
// WHY a separate file: the real pages stay untouched; project.mjs only calls these when the preview switch is on.
import { esc, url, SOCIAL, factChips, codeUrl } from './lib.mjs';
import { famNodes, famFacts, inFamily, shown } from './family.mjs';

const tpl = (id, title, html) => `<template data-for="${id}" data-title="${esc(title)}">${html}</template>`;
const pillOf = (s) => `<span class="pill fam-${s.key}">${s.text}</span>`;
const nameLink = (n, bold) => n.outside ? (n.url ? `<a href="${esc(n.url)}" rel="noopener">${esc(n.name)}</a>` : esc(n.name)) : (n.here ? `<b>${esc(n.p.name)}</b>` : `<a href="${url(`p/${n.p.id}/`)}">${esc(n.p.name)}</a>`);
const nodeName = (n) => (n.outside ? n.name : n.p.name);

// The label for an unclaimed page (surface 6): the same words everywhere, so the options differ only in where they sit.
export const CLAIM_SHORT = 'Managed by r/TrueOpenSource and drafted with AI help.';
export const CLAIM_FULL = 'This listing is managed by r/TrueOpenSource and drafted with AI assistance. Project owners and developers may claim it and update their profile and page by tagging their project. This note disappears once a developer has claimed the page.';

// ── The top card: name, ONE chip row, description, then the buttons right-aligned in the foot where they used to be ──
// WHY (Destin: "the three buttons should stay right aligned and where they were"): the foot is a row with the buttons pushed to the
// right edge, the filled one last, as on the old page; on a phone they spread across the full width, filled on top.
export function rvTop(p, links, fam, variant) {
  const f = famFacts(p, fam);
  // Option b carries the family in the chip row: where it came from (a link) and how many came from it (a popover).
  const famChips = variant === 'b' ? [
    f.own ? `<button class="chip tipchip" type="button" data-tip="family" aria-expanded="false">${esc(f.own)}<svg class="tipi" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button>` : '',
    f.kids ? `<button class="chip tipchip" type="button" data-tip="kids" aria-expanded="false">${f.kids} ${f.kids === 1 ? 'fork' : 'forks'}<svg class="tipi" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button>` : '',
  ].join('') : '';
  return `<div class="surface identity rv v${variant} rvtop" data-tipscope>
    <div class="row"><h1 class="h-subject">${esc(p.name)}</h1></div>
    <div class="chiprow">${factChips(p, null, '', { links: true }).replace(/class="chip setup (easy|advanced)"/, 'class="chip"')}${famChips}${SOCIAL ? `<button class="chip tipchip claimchip" type="button" data-claim-chip="${esc(p.id)}" data-repo="${esc(codeUrl(p) ?? '')}" hidden aria-expanded="false">Unclaimed</button>` : ''}</div>
    <p class="body2">${esc(p.summary)}</p>
    ${SOCIAL ? `<div class="claimbox" data-claim-line="${esc(p.id)}" data-repo="${esc(codeUrl(p) ?? '')}" hidden></div>` : ''}
    <div class="rvfoot">${links ? `<div class="links">${links}</div>` : ''}</div>
    ${variant === 'b' ? rvFamPopover(p, fam) : ''}
  </div>`;
}

// b: everything the old Family section said, as one popover list under the "N forks" chip.
function rvFamPopover(p, fam) {
  const nodes = famNodes(p, fam);
  if (!nodes.length) return '';
  const rows = nodes.map((n) => `<li class="d${n.depth}">${nodeName(n) === p.name && n.here ? `<b>${esc(p.name)}</b>` : nameLink(n)}<span>${esc(n.rel || n.status.text)}</span>${n.why ? `<em>${esc(n.why)} <a href="${esc(n.source)}" rel="noopener">Source</a></em>` : ''}</li>`).join('');
  const html = `<ul class="tiplist wide">${rows}</ul><p class="tipwhy">Each project is rated on its own: a copy is a different product.</p>`;
  return tpl('kids', `Family of ${esc(p.name)}`, html) + tpl('family', `Family of ${esc(p.name)}`, html);
}

// ── Option a: a compact Family card under the top card, a short list with one grey word per row; the long "why" is behind an (i) ──
export function rvFamilyA(p, fam) {
  const nodes = famNodes(p, fam); if (!nodes.length) return '';
  const row = (n, i) => `<li class="frow d${n.depth}${n.here ? ' here' : ''}${i >= 5 ? ' extra' : ''}"${n.here ? ' aria-current="page"' : ''}>
      <span class="fn">${nameLink(n)}</span>${pillOf(n.status)}<span class="fr">${esc(n.rel || '')}</span>
      ${n.why ? `<button class="whybtn" type="button" data-tip="f${i}" aria-expanded="false" aria-label="Why ${esc(nodeName(n))} is listed in this family"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button>` : '<span class="whyspace"></span>'}</li>`;
  const tips = nodes.map((n, i) => n.why ? tpl(`f${i}`, nodeName(n), `<p>${esc(n.why)}</p><p><a href="${esc(n.source)}" rel="noopener">Source</a></p>`) : '').join('');
  return `<section class="surface sec rv va rvfamA rfold" id="family" data-tipscope data-more-scope>
    <div class="sec-head" data-fold><div><h2 class="h-large">Family<span class="count">${nodes.length}</span></h2><p class="desc12">Where it came from and what came from it. Each is rated on its own.</p></div></div>
    <ul class="flist lvl2">${nodes.map(row).join('')}</ul>
    ${nodes.length > 5 ? `<button class="btn sm secondary showall" type="button" data-showall>Show all ${nodes.length}</button>` : ''}${tips}</section>`;
}

// ── Option c: the family as a row of small cards across the page, each one a project, the current one marked ──
export function rvFamilyC(p, fam) {
  const nodes = famNodes(p, fam); if (!nodes.length) return '';
  const card = (n) => `<div class="fcard${n.here ? ' here' : ''}"${n.here ? ' aria-current="page"' : ''}>
      <div class="fc-name">${nameLink(n)}</div>
      <div class="fc-meta">${pillOf(n.status)}</div>
      <div class="fc-rel">${n.depth === 0 ? 'Where it started' : `${esc(n.rel)}${n.depth > 1 && n.parent ? ` of ${esc(n.parent)}` : ''}`}</div></div>`;
  return `<section class="surface sec rv vc rvfamC rfold" id="family">
    <div class="sec-head" data-fold><div><h2 class="h-large">Family<span class="count">${nodes.length}</span></h2><p class="desc12">Where it came from and what came from it. Each is rated on its own: a copy is a different product.</p></div></div>
    <div class="frail scroll-x">${nodes.map(card).join('')}</div></section>`;
}
