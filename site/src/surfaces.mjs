// Three surfaces built from research data, kept in one module so the shared page files only need a hook line each:
//   1. feature checklists  (data/features.json)          2. switch guides (data/switch-guides.json)
//   3. AI-contribution labels (data/ai-contribution.json)
// Every input is optional: with no file, every function returns '' and the pages are exactly as before.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, url, SOCIAL, codeUrl } from './lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const load = (f, empty) => { try { return JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8')); } catch { return empty; } };
export const FEATURES = load('features.json', { tags: {}, groups: {}, answers: {} });
export const GUIDES = load('switch-guides.json', { guides: {} }).guides;
export const AI = load('ai-contribution.json', { projects: {} }).projects;

// ───────── 1. Feature checklists ─────────
// WHY a mark that is not only a colour: ✓ / ~ / ✗ differ in shape, so they read without colour (design guide).
const MARK = { yes: ['✓', 'Yes'], partly: ['~', 'Partly'], no: ['✗', 'No'] };
export const tagsOf = (g) => (FEATURES.groups[g.id] ?? []).map((id) => ({ id, ...FEATURES.tags[id] })).filter((t) => t.name);
export const answerOf = (pid, tag) => FEATURES.answers[pid]?.[tag] ?? null;
const markEl = (v) => (v ? `<span class="fm ${v}" title="${MARK[v][1]}" aria-label="${MARK[v][1]}">${MARK[v][0]}</span>` : '<span class="fm unk" aria-label="Not checked yet">·</span>');
const srcLink = (a) => (a?.source ? `<a href="${esc(a.source)}" rel="noopener">Source</a>` : '');

// Attributes for an alternative card: which tags it has (a "yes"). WHY yes only: "Must have" means the whole thing; partly and unknown never match.
export function cardAttrs(p, g) {
  if (!g) return '';
  const yes = tagsOf(g).filter((t) => answerOf(p.id, t.id)?.v === 'yes').map((t) => t.id);
  return ` data-pid="${esc(p.id)}" data-feat="${yes.join(' ')}"`;
}

// The group's tags with this project's answers.
function tagRows(p, g, { sources = false } = {}) {
  return tagsOf(g).map((t) => {
    const a = answerOf(p.id, t.id);
    return `<li class="${a ? a.v : 'unk'}">${markEl(a?.v)}<span class="fn" title="${esc(t.question)}">${esc(t.name)}</span>${a?.note ? `<span class="fnote">${esc(a.note)}</span>` : ''}${sources ? srcLink(a) : ''}</li>`;
  }).join('');
}

// The fold section on a card (and the home of the AI line): closed by default, so the card hero stays clean (Destin).
export function cardFold(p, g) {
  const tags = g ? tagsOf(g) : [];
  const answered = tags.filter((t) => answerOf(p.id, t.id)).length;
  const a = AI[p.id];
  const label = a?.label ? aiLine(p, a) : '';
  const stop = a?.outsideHelp === 'not-accepting' ? '<p class="quiet">Not accepting outside code</p>' : '';
  if (!answered && !label && !stop) return '';
  const yes = tags.filter((t) => answerOf(p.id, t.id)?.v === 'yes').length;
  return `<details class="cfold"><summary>Features${answered ? `<span class="muted11">${yes} of ${tags.length}</span>` : ''}</summary>
    ${answered ? `<ul class="flist2">${tagRows(p, g)}</ul>` : ''}${label || stop ? `<div class="cfold-ai">${label}${stop}</div>` : ''}
    ${a?.label ? aiTemplate(p, a) : ''}</details>`;
}

// Group page: "Must have" multi-select + Cards / Compare switch. Only when the group has tags and at least two alternatives.
export function groupTools(g, alts) {
  const tags = tagsOf(g); if (!tags.length || alts.length < 2) return '';
  const n = (t) => alts.filter((x) => answerOf(x.p.id, t.id)?.v === 'yes').length;
  return `<div class="dd"><button class="select sm" type="button" data-menu="mustMenu" aria-haspopup="listbox" aria-expanded="false"><span data-must-label>Must have</span>${CHEV}</button>
    <div class="menu must-menu" id="mustMenu" role="listbox" aria-multiselectable="true">${tags.map((t) => `<button class="mi" type="button" role="option" aria-selected="false" data-must="${esc(t.id)}" title="${esc(t.question)}"><span class="tick"></span><span class="mname">${esc(t.name)}</span><span class="muted11">${n(t)}</span></button>`).join('')}
      <div class="menu-sep"></div><button class="mi" type="button" data-must-clear>Clear</button></div></div>
    <div class="seg" role="group" aria-label="View"><button type="button" class="on" data-view="cards" aria-pressed="true">Cards</button><button type="button" data-view="compare" aria-pressed="false">Compare</button></div>`;
}
const CHEV = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

// The compare table. Rows are in the same best-first order as the cards. A cell with a note or source opens it on tap / hover.
export function groupCompare(g, alts) {
  const tags = tagsOf(g); if (!tags.length || alts.length < 2) return '';
  return `<div class="cmpwrap" data-compare hidden><div class="cmpscroll"><table class="cmp"><thead><tr><th scope="col">Project</th>${tags.map((t) => `<th scope="col"><button type="button" class="cmph" data-q="${esc(t.question)}" data-m="${esc(t.meaning)}" data-name="${esc(t.name)}">${esc(t.name)}</button></th>`).join('')}</tr></thead>
    <tbody>${alts.map((x) => `<tr data-pid="${esc(x.p.id)}"><th scope="row"><a href="${url(`p/${x.p.id}/`)}">${esc(x.p.name)}</a></th>${tags.map((t) => {
      const a = answerOf(x.p.id, t.id);
      return a ? `<td><button type="button" class="cell ${a.v}" data-name="${esc(t.name)}" data-v="${MARK[a.v][1]}"${a.note ? ` data-note="${esc(a.note)}"` : ''}${a.source ? ` data-src="${esc(a.source)}"` : ''} title="${esc([t.name + ': ' + MARK[a.v][1], a.note].filter(Boolean).join(' · '))}">${MARK[a.v][0]}</button></td>` : '<td><span class="fm unk" aria-label="Not checked yet">·</span></td>';
    }).join('')}</tr>`).join('')}</tbody></table></div><div class="callout info" data-cmp-none hidden>None of these have everything you picked.</div></div>
  <div class="callout info" data-must-none hidden>None of these have everything you picked.</div>`;
}

// Project page: one Features card per group the project is listed in.
export function projectFeatures(p, listed) {
  return listed.map(({ group }) => {
    const tags = tagsOf(group); if (!tags.some((t) => answerOf(p.id, t.id))) return '';
    return `<section class="surface sec fold-phone"><div class="sec-head fold-head"><div><h2 class="h-large">Features${listed.length > 1 ? ` in ${esc(group.name)}` : ''}</h2></div></div>
      <ul class="flist2 big">${tagRows(p, group, { sources: true })}</ul></section>`;
  }).join('');
}

// Gaps page: tags where every alternative that was asked says no ("Missing everywhere"), and where the best anyone says is "partly".
// WHY unknown never counts as no: a group only qualifies when EVERY alternative has an answer. WHY two or more alternatives: with one,
// "everywhere" would just mean "that one project".
export function gapsMissing(d) {
  const out = { none: [], partly: [] };
  for (const g of d.groups) {
    const alts = g.alternatives.map((a) => a.project).filter((id) => d.projById.has(id)); if (alts.length < 2) continue;
    for (const t of tagsOf(g)) {
      const v = alts.map((id) => answerOf(id, t.id)?.v);
      if (v.some((x) => !x)) continue;
      const kind = v.every((x) => x === 'no') ? 'none' : !v.includes('yes') ? 'partly' : null; if (!kind) continue;
      let e = out[kind].find((x) => x.g === g); if (!e) out[kind].push(e = { g, tags: [] }); e.tags.push(t);
    }
  }
  const card = ({ g, tags }) => `<div class="card gcard"><div class="head"><h3><a class="crumb-strong" href="${url(`g/${g.id}/`)}">${esc(g.name)}</a></h3></div><div class="chiprow wrapchips">${tags.map((t) => `<span class="chip" title="${esc(t.question)}">${esc(t.name)}</span>`).join('')}</div></div>`;
  const sec = (id, title, list) => (list.length ? `<section class="surface sec" id="${id}"><div class="sec-head"><div><h2 class="h-large">${title}<span class="count">${list.reduce((n, e) => n + e.tags.length, 0)}</span></h2></div></div><div class="row1 fill list">${list.map(card).join('')}</div></section>` : '');
  return sec('missing-everywhere', 'Missing everywhere', out.none) + sec('partly-anywhere', 'Only partly anywhere', out.partly);
}

// ───────── 2. Switch guides ─────────
export function switchGuide(slug, name, d) {
  const g = GUIDES[slug]; if (!g) return '';
  const projs = g.opensIn.map((o) => ({ o, p: d.projById.get(o.project) })).filter((x) => x.p);
  const block = (title, html) => `<div class="swblock"><h3>${title}</h3>${html}</div>`;
  return `<section class="surface sec fold-phone swcard" id="switch">
    <div class="sec-head fold-head"><div><h2 class="h-large">Switching from ${esc(name)}</h2></div></div>
    <div class="swgrid">
      ${g.export?.length ? block('Get your data out', `<ol>${g.export.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>${g.tip ? `<p class="small2">${esc(g.tip)}</p>` : ''}${g.exportSource ? `<a class="swsrc" href="${esc(g.exportSource)}" rel="noopener">${esc(name)}'s own instructions</a>` : ''}`) : ''}
      ${g.formats?.length ? block('What you\'ll get', `<ul>${g.formats.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`) : ''}
      ${g.wontComeOver?.length ? block('What won\'t come over', `<ul>${g.wontComeOver.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`) : ''}
      ${projs.length ? block('Opens it directly', `<div class="chiprow wrapchips">${projs.map(({ o, p }) => `<a class="chip link" href="${url(`p/${p.id}/`)}" title="${esc(o.note)}">${esc(p.name)}</a>`).join('')}</div>`) : ''}
    </div></section>`;
}

// ───────── 3. AI-contribution labels ─────────
export const AI_LABEL = {
  'non-developers-welcome': 'AI Contributions: Non-developers welcome',
  'traditional-developers-only': 'AI Contributions: Traditional developers only',
  'not-accepted': 'AI Contributions: Not accepted',
  'see-policy': 'AI Contributions: See policy',
};
const HELP = { 'welcomes-prs': 'Welcomes pull requests', 'issue-first': 'Open an issue first', 'not-accepting': 'Not accepting outside code' };
const claimHref = (p) => url(`tag/?repo=${encodeURIComponent(codeUrl(p) ?? '')}`);
const aiButton = (a, cls) => `<button class="${cls}" type="button" data-tip="ai" aria-expanded="false">${esc(AI_LABEL[a.label])}</button>`;
// On a card: the label as a small link-style button that opens the pop-up.
const aiLine = (p, a) => aiButton(a, 'ailink');

// The pop-up: the project's tuned description, its own words, outside help and where to start.
function aiTemplate(p, a) {
  const start = [a.contributing && `<a href="${esc(a.contributing)}" rel="noopener">Contributing guide</a>`, a.goodFirstIssues && `<a href="${esc(a.goodFirstIssues)}" rel="noopener">Beginner issues</a>`].filter(Boolean);
  const help = a.outsideHelp ? `<p><b>${HELP[a.outsideHelp]}.</b>${a.outsideHelpNote ? ` ${esc(a.outsideHelpNote)}` : ''}</p>` : '';
  return `<template data-for="ai" data-title="${esc(AI_LABEL[a.label])}">
    <p>${esc(a.description)}</p>
    ${a.quote ? `<blockquote class="aiq">“${esc(a.quote)}”${a.source ? ` <a href="${esc(a.source)}" rel="noopener">Read it</a>` : ''}</blockquote>` : ''}
    ${help ? `<h4 class="aih">Outside help</h4>${help}` : ''}
    ${start.length ? `<h4 class="aih">Where to start</h4><p class="aistart">${start.join(' · ')}</p>` : ''}
    <p class="aifoot">This listing is managed by r/TrueOpenSource and was drafted with AI assistance.${SOCIAL ? ` If you maintain this project, <a href="${claimHref(p)}">claim this listing here</a>.` : ''}</p></template>`;
}

// Project page: sits inside (or, with no other help links, makes) the "How to help" card.
export function helpWithAi(p, helpHtml) {
  const a = AI[p.id];
  const row = a?.label
    ? aiButton(a, 'btn md secondary helprow')
    : `<p class="aiempty"><b>AI Contributions</b> Not stated yet. Maintainers can set this by ${SOCIAL ? `<a href="${claimHref(p)}">claiming the listing</a>` : 'claiming the listing'}.</p>`;
  const stop = a?.outsideHelp === 'not-accepting' ? '<p class="quiet">Not accepting outside code</p>' : '';
  const extra = row + stop + (a?.label ? aiTemplate(p, a) : '');
  if (helpHtml) return helpHtml.replace('id="help">', () => 'id="help" data-tipscope>').replace('<div class="stack">', () => `<div class="stack">${row}${stop}`).replace(/<\/section>\s*$/, () => `${a?.label ? aiTemplate(p, a) : ''}</section>`);
  return `<section class="surface sec fold-phone" id="help" data-tipscope><div class="sec-head fold-head"><div><h2 class="h-large">How to help</h2></div></div><div class="stack">${extra}</div></section>`;
}
