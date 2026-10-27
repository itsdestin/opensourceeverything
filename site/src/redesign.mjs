// The project page's top card and Family card (Destin's picks from the redesign round).
import { esc, url, SOCIAL, factChips, codeUrl, SETUP, setupOf, setupWhy } from './lib.mjs';
import { famNodes } from './family.mjs';

const tpl = (id, title, html) => `<template data-for="${id}" data-title="${esc(title)}">${html}</template>`;
const pillOf = (s) => `<span class="pill fam-${s.key}">${s.text}</span>`;
const nameLink = (n, bold) => n.outside ? (n.url ? `<a href="${esc(n.url)}" rel="noopener">${esc(n.name)}</a>` : esc(n.name)) : (n.here ? `<b>${esc(n.p.name)}</b>` : `<a href="${url(`p/${n.p.id}/`)}">${esc(n.p.name)}</a>`);
const nodeName = (n) => (n.outside ? n.name : n.p.name);

// ── The top card: name, ONE chip row, description, the claim note while nobody has claimed the page, then the buttons right-aligned ──
// WHY (Destin: "the three buttons should stay right aligned and where they were"): the foot is a row with the buttons pushed to the
// right edge, the filled one last, as on the old page; on a phone they stack full width, filled on top.
export function rvTop(p, links) {
  return `<div class="surface identity rvtop" data-tipscope>
    <div class="row"><h1 class="h-subject">${esc(p.name)}</h1></div>
    <div class="chiprow">${factChips(p, null, '', { links: true }).replace(/<span class="chip setup (easy|advanced)"[^>]*>[^<]*<\/span>/, `<button class="chip tipchip" type="button" data-tip="setup" aria-expanded="false">${SETUP[setupOf(p)]}</button>`)}</div>
    <p class="body2">${esc(p.summary)}</p>
    <div class="rvfoot">${SOCIAL ? `<p class="claimq" data-claim-line="${esc(p.id)}" data-repo="${esc(codeUrl(p) ?? '')}" hidden></p>` : ''}${links ? `<div class="links">${links}</div>` : ''}</div>
    ${tpl('setup', SETUP[setupOf(p)], `<p>How hard it is to start using it. <b>Easy</b>: install it like a normal app, or use it in your browser. <b>Advanced</b>: you run it on your own server, use the command line, or it is a tool for developers.</p>`)}
  </div>`;
}

// ── The Family card (Destin picked a): a short list, one grey line per row; the long "why" is behind an (i). Folded closed on phones. ──
export function rvFamilyA(p, fam) {
  const nodes = famNodes(p, fam); if (!nodes.length) return '';
  // Each row: the relative's name and status, then ONE grey line saying how it differs (Destin: always framed by how it differs from its upstream).
  // Until a project has that line, the plain relation words stand in.
  const row = (n, i) => `<li class="frow d${n.depth}${n.here ? ' here' : ''}${i >= 5 ? ' extra' : ''}"${n.here ? ' aria-current="page"' : ''}>
      <div class="fmain"><div class="ftop"><span class="fn">${nameLink(n)}</span>${pillOf(n.status)}</div>${n.diff || n.rel ? `<div class="fr">${esc(n.diff || n.rel)}</div>` : ''}</div>
      ${n.why ? `<button class="whybtn" type="button" data-tip="f${i}" aria-expanded="false" aria-label="Why ${esc(nodeName(n))} is in this family"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg></button>` : '<span class="whyspace"></span>'}</li>`;
  const tips = nodes.map((n, i) => n.why ? tpl(`f${i}`, nodeName(n), `<p>${esc(n.why)}</p><p><a href="${esc(n.source)}" rel="noopener">Source</a></p>`) : '').join('');
  return `<section class="surface sec rvfamA fold-phone" id="family" data-tipscope data-more-scope>
    <div class="sec-head fold-head"><div><h2 class="h-large">Family<span class="count">${nodes.length}</span></h2></div></div>
    <ul class="flist lvl2">${nodes.map(row).join('')}</ul>
    ${nodes.length > 5 ? `<button class="btn sm secondary showall" type="button" data-showall>Show all ${nodes.length}</button>` : ''}${tips}</section>`;
}
