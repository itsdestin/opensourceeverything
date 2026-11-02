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
    <ul class="flist">${nodes.map(row).join('')}</ul>
    ${nodes.length > 5 ? `<button class="btn sm secondary showall" type="button" data-showall>Show all ${nodes.length}</button>` : ''}${tips}</section>`;
}

// A trail under the top bar: where this page sits on the map, so a visitor can step up a level.
// WHY rebuilt (Destin, Nov 2: "breadcrumbs and back button feel super broken and confusing"). Before: only project pages had a
// back arrow, and it went to the previous page in history while the trail beside it showed a different, fixed path; closed-app
// pages had no trail at all; trails started mid-way, at a level other pages skipped; the area was called "Apps for everyday life"
// though the home page says "Everyday apps"; and the trail's links were pills that looked like the filter chips. Now:
// - every page below home has the same trail, always starting at the area: Area › Category › Group › this page;
// - on wide screens it is the whole trail as plain text links; on phones it is one link up a level ("‹ Photo editing"), which
//   is the back button, always going to the same place the trail shows. The browser's own back still goes to the last page.
// - Home itself is the house button at the top left, so the trail doesn't repeat it.
// items: [[label, href], ...]; the last is this page (plain text).
const UP = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
export const crumbs = (items) => {
  // WHY nothing for a lone item (a project in no group): a trail of just the page's own name leads nowhere.
  if (items.length < 2) return '';
  const parent = items.length > 1 ? items[items.length - 2] : null;
  return `<nav class="crumbs" aria-label="Breadcrumb">
    ${parent ? `<a class="crumb-up" href="${parent[1]}">${UP}${esc(parent[0])}</a>` : ''}
    <ol class="crumb-trail">${items.map(([label, href], i) => `<li>${href && i < items.length - 1 ? `<a href="${href}">${esc(label)}</a>` : `<span aria-current="page">${esc(label)}</span>`}</li>`).join('')}</ol>
  </nav>`;
};
// WHY the home page's name for an area: the trail's first link opens that area's fold on the home page, so it must match its title there.
export const areaLabel = (a) => (a.id === 'everyday' ? 'Everyday apps' : a.name);
// The trail from the area down to this page. category: a category page (its own name ends the trail); group: a page inside
// that group (group page, project, closed app).
export const mapTrail = (d, { category, group }, here) => {
  const cat = d.catById.get(group?.category ?? category); const area = cat && d.areaOf.get(cat.id);
  return crumbs([
    ...(area ? [[areaLabel(area), url(`#area-${area.id}`)]] : []),
    ...(cat && group ? [[cat.name, url(`c/${cat.id}/`)]] : []),
    ...(group && group.name !== here ? [[group.name, url(`g/${group.id}/`)]] : []),
    [here],
  ]);
};
