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

// WHY no fold on the card any more (Destin, round 5: "that's atrocious ux/ui"): features live in Compare, on the project page and in the Must have filter.
// Option B, shown only with ?v=b so both can be compared: ONE quiet grey line, "Has 4 of 6 · Live co-editing ✗" (the first thing it lacks).
export function cardFold(p, g) {
  const tags = g ? tagsOf(g) : [];
  const answered = tags.filter((t) => answerOf(p.id, t.id));
  if (!answered.length) return '';
  const yes = tags.filter((t) => answerOf(p.id, t.id)?.v === 'yes').length;
  const miss = tags.filter((t) => answerOf(p.id, t.id)?.v === 'no');
  return `<p class="featline"><b>Has ${yes} of ${tags.length}</b>${miss.length ? ` · ${esc(miss[0].name)} ✗${miss.length > 1 ? ` +${miss.length - 1}` : ''}` : ''}</p>`;
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

// Project page: ONE first-level card (Card levels), each tag a boxed row like a Settings row: its name at the left, Yes / Partly / No as a status Pill at the right,
// the note under the name in 12px grey with the source as a small link in that same line. Grouped under the group's name only when the project is listed in several groups.
// Tags nobody has checked yet are left out: a row that says nothing is not worth a row.
const PILL = { yes: ['ok', 'Yes', true], partly: ['warn', 'Partly', true], no: ['', 'No', false] };
export function projectFeatures(p, listed) {
  const groups = listed.map(({ group }) => ({ group, rows: tagsOf(group).map((t) => ({ t, a: answerOf(p.id, t.id) })).filter((r) => r.a) })).filter((x) => x.rows.length);
  if (!groups.length) return '';
  const row = ({ t, a }) => { const [tone, word, dot] = PILL[a.v];
    return `<div class="frowx"><div class="fx-main"><span class="fx-name" title="${esc(t.question)}">${esc(t.name)}</span>${a.note || a.source ? `<span class="fx-note">${a.note ? esc(a.note) : ''}${a.note && a.source ? ' ' : ''}${srcLink(a)}</span>` : ''}</div><span class="pill ${tone}">${dot ? '<i></i>' : ''}${word}</span></div>`; };
  return `<section class="surface sec fold-phone rvfeat"><div class="sec-head fold-head"><div><h2 class="h-large">Features</h2></div></div>
    ${groups.map(({ group, rows }) => `${groups.length > 1 ? `<h3 class="label fx-group">${esc(group.name)}</h3>` : ''}<div class="fx-list">${rows.map(row).join('')}</div>`).join('')}</section>`;
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
// WHY one first-level card with three FoldRows (Destin, round 5: "ugly and poorly positioned"): it sits BELOW the alternatives (people come for those first); the first row is
// open on desktop and all are closed on a phone (surfaces.js). Steps are a numbered list, sources small links, and the projects that open the file are Chips.
const fold = (title, body, open) => `<details class="foldrow lvl1"${open ? ' open data-first' : ''}><summary><span>${title}</span></summary><div class="foldbody">${body}</div></details>`;
export function switchGuide(slug, name, d) {
  const g = GUIDES[slug]; if (!g) return '';
  const projs = g.opensIn.map((o) => ({ o, p: d.projById.get(o.project) })).filter((x) => x.p);
  const src = g.exportSource ? `<a class="swsrc" href="${esc(g.exportSource)}" rel="noopener">Source</a>` : '';
  const out = g.export?.length ? fold('Get your data out', `<ol class="swsteps">${g.export.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>${g.tip ? `<p class="small2">${esc(g.tip)}</p>` : ''}${g.formats?.length ? `<p class="small2">You get: ${g.formats.map(esc).join(', ')}.</p>` : ''}${src}`, true) : '';
  const lost = g.wontComeOver?.length ? fold("What won't come over", `<ul class="swsteps">${g.wontComeOver.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`) : '';
  const opens = projs.length ? fold('What opens it directly', `<div class="chiprow wrapchips">${projs.map(({ o, p }) => `<a class="chip link" href="${url(`p/${p.id}/`)}" title="${esc(o.note)}">${esc(p.name)}</a>`).join('')}</div>`) : '';
  return `<section class="surface sec swcard" id="switch"><div class="sec-head"><div><h2 class="h-large">Switching from ${esc(name)}</h2></div></div><div class="swfolds">${out}${lost}${opens}</div></section>`;
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

// The expandable card (FoldRow look, Destin round 5): closed = "AI contributions" with the label as a Pill at the right; open = description, their own words (quote + link),
// outside help and where to start, all inside the same box. `[data-ai-extra]` is filled in by contrib.js with the owner's contributor preferences, when they set some.
const AI_SHORT = { 'non-developers-welcome': 'Non-developers welcome', 'traditional-developers-only': 'Traditional developers only', 'not-accepted': 'Not accepted', 'see-policy': 'See policy' };
function aiFold(p, a) {
  const start = [a.contributing && `<a href="${esc(a.contributing)}" rel="noopener">Contributing guide</a>`, a.goodFirstIssues && `<a href="${esc(a.goodFirstIssues)}" rel="noopener">Beginner issues</a>`].filter(Boolean);
  const help = a.outsideHelp ? `<p><b>${HELP[a.outsideHelp]}.</b>${a.outsideHelpNote ? ` ${esc(a.outsideHelpNote)}` : ''}</p>` : '';
  return `<details class="foldrow lvl1 aifold"><summary><span>AI contributions</span><span class="pill info" data-ai-pill>${esc(AI_SHORT[a.label])}</span></summary><div class="foldbody">
    <p>${esc(a.description)}</p>
    ${a.quote ? `<blockquote class="aiq">“${esc(a.quote)}”${a.source ? ` <a href="${esc(a.source)}" rel="noopener">Read it</a>` : ''}</blockquote>` : ''}
    ${help ? `<h4 class="aih">Outside help</h4>${help}` : ''}
    ${start.length ? `<h4 class="aih">Where to start</h4><p class="aistart">${start.join(' · ')}</p>` : ''}
    <div data-ai-extra></div></div></details>`;
}

// Project page: sits inside (or, with no other help links, makes) the "How to help" card.
export function helpWithAi(p, helpHtml) {
  const a = AI[p.id];
  const row = a?.label ? aiFold(p, a)
    : `<p class="aiempty"><b>AI Contributions</b> Not stated yet. Maintainers can set this by ${SOCIAL ? `<a href="${claimHref(p)}">claiming the listing</a>` : 'claiming the listing'}.</p>`;
  const stop = a?.outsideHelp === 'not-accepting' ? '<p class="quiet">Not accepting outside code</p>' : '';
  // data-prefs: filled in by contrib.js with the owner's "How you'd like help" answers (rows) when they have set some.
  const slot = SOCIAL ? `<div class="prefs-slot" data-prefs data-project="${esc(p.id)}" hidden></div>` : '';
  if (helpHtml) return helpHtml.replace('id="help">', () => 'id="help" data-tipscope>').replace('<div class="stack">', () => `<div class="stack">${row}${stop}${slot}`);
  return `<section class="surface sec fold-phone" id="help" data-tipscope><div class="sec-head fold-head"><div><h2 class="h-large">How to help</h2></div></div><div class="stack">${row}${stop}${slot}</div></section>`;
}
