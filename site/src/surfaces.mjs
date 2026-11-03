// Three surfaces built from research data, kept in one module so the shared page files only need a hook line each:
//   1. feature checklists  (data/features.json)          2. switch guides (data/switch-guides.json)
//   3. AI-contribution labels (data/ai-contribution.json)
// Every input is optional: with no file, every function returns '' and the pages are exactly as before.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc, url, SOCIAL, codeUrl } from './lib.mjs';
import { appUrl } from './cards.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const load = (f, empty) => { try { return JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8')); } catch { return empty; } };
export const FEATURES = load('features.json', { tags: {}, groups: {}, answers: {} });
export const GUIDES = load('switch-guides.json', { guides: {} }).guides;
export const AI = load('ai-contribution.json', { projects: {} }).projects;
// WHY (evidence map step 1, docs/evidence-map-design.md §1): closed apps answer the same checklists, keyed by app name.
export const CLOSED = load('closed-apps.json', { apps: {} }).apps;
export const closedAnswerOf = (name, tag) => CLOSED[name]?.answers?.[tag] ?? null;
export const closedStatus = (name) => CLOSED[name]?.status ?? null;

// ───────── 1. Feature checklists ─────────
// WHY a mark that is not only a colour: ✓ / ~ / ✗ differ in shape, so they read without colour (design guide).
const MARK = { yes: ['✓', 'Yes'], partly: ['~', 'Partly'], no: ['✗', 'No'], own: ['—', 'Its own format'] }; // WHY own: an item about the closed app's own files (merge-closed-answers.mjs)
export const tagsOf = (g) => (FEATURES.groups[g.id] ?? []).map((id) => ({ id, ...FEATURES.tags[id] })).filter((t) => t.name);
export const answerOf = (pid, tag) => FEATURES.answers[pid]?.[tag] ?? null;
const markEl = (v) => (v ? `<span class="fm ${v}" title="${MARK[v][1]}" aria-label="${MARK[v][1]}">${MARK[v][0]}</span>` : '<span class="fm unk" aria-label="Not checked yet">·</span>');
const srcLink = (a) => (a?.source ? `<a href="${esc(a.source)}" rel="noopener">Source</a>` : '');

// ───────── Source labels (evidence map §2) ─────────
// WHY one label everywhere a value shows: who filled it, where it came from, how, and when, one tap away.
// WHY it leads with the site's name (design §2: "Source: blender.org · AI-researched", not "AI said"): the source is the
// evidence; the AI only found it. WHY a default month for the open answers: they were researched Oct 26–31 and carry no date.
const OPEN_CHECKED = '2026-10';
const BY = { ai: 'AI-researched', test: 'Our test', community: 'Community-tested' };
// WHY GitHub's file host shows as "github.com": raw.githubusercontent.com is the same source, and too long for a chip.
export const srcHost = (u) => { try { const h = new URL(u).hostname.replace(/^www\./, ''); return h === 'raw.githubusercontent.com' ? 'github.com' : h; } catch { return ''; } };
const month = (d) => { const [y, m] = String(d).split('-'); return m ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]} ${y}` : ''; };
// The data-* a tip needs; surfaces.js draws the tip from them.
export const provAttrs = (a, t) => (a?.source ? ` data-src="${esc(a.source)}" data-host="${esc(srcHost(a.source))}" data-by="${esc(BY[a.by ?? 'ai'])}" data-when="${esc(month(a.checked ?? OPEN_CHECKED))}"${a.quote ? ` data-quote="${esc(a.quote)}"` : ''}${t?.meaning ? ` data-m="${esc(t.meaning)}"` : ''}` : '');
// WHY "Source" alone on a phone (Nov 2 screenshots): the site name squeezed the feature's own text into a narrow column.
export const provLabel = (a, t) => (a?.source ? `<button type="button" class="prov" data-name="${esc(t.name)}" data-v="${MARK[a.v][1]}"${a.note ? ` data-note="${esc(a.note)}"` : ''}${provAttrs(a, t)}><span class="prov-long">${esc(srcHost(a.source))} · AI</span><span class="prov-short">Source</span></button>` : '');

// WHY which app and which feature on every mark (step 2, Nov 3): tapping one opens "What people say" for exactly that pair.
// subj: "p:<project id>" or "c:<closed app name>"; the server keys answers by subj + "/" + tag.
export const subjAttrs = (subj, sname, t) => (SOCIAL ? ` data-subj="${esc(subj)}" data-sname="${esc(sname)}" data-ftag="${esc(t.id)}" data-q="${esc(t.question ?? '')}"` : '');

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
  const tags = tagsOf(g); if (!tags.length || alts.length < 2) return { must: '', seg: '' };
  const n = (t) => alts.filter((x) => answerOf(x.p.id, t.id)?.v === 'yes').length;
  return { must: `<div class="dd"><button class="select sm" type="button" data-menu="mustMenu" aria-haspopup="listbox" aria-expanded="false"><span data-must-label>Must have</span>${CHEV}</button>
    <div class="menu must-menu" id="mustMenu" role="listbox" aria-multiselectable="true">${tags.map((t) => `<button class="mi" type="button" role="option" aria-selected="false" data-must="${esc(t.id)}" title="${esc(t.question)}"><span class="tick"></span><span class="mname">${esc(t.name)}</span><span class="muted11">${n(t)}</span></button>`).join('')}
      <div class="menu-sep"></div><button class="mi" type="button" data-must-clear>Clear</button></div></div>`, seg: `<div class="seg" role="group" aria-label="View"><button type="button" class="on" data-view="cards" aria-pressed="true">Cards</button><button type="button" data-view="compare" aria-pressed="false">Compare</button></div>` };
}
const CHEV = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

// The compare table. Rows are in the same best-first order as the cards. A cell with a note or source opens it on tap / hover.
// WHY closed apps on top (design §1, Nov 2): the table answers "how does each open project compare with the app I'm leaving?".
// They are tinted and tagged "Proprietary", so they never read as alternatives. A column where a closed app says
// yes and no open project does is marked: that is a gap in a feature, not only a missing app (design §1).
const cmpCell = (a, t, app, subj = `c:${app}`) => { if (a?.v === 'own') a = { ...a, note: `This is about ${app}'s own files, so it doesn't apply.` };
  const s = a?.v === 'own' ? '' : subjAttrs(subj, app, t); // WHY no votes on "its own format": there is nothing to answer
  // WHY a blank is a button once there's a server (Destin, step-2 deck Q-4: yes): people can give the first answer there.
  return a ? `<td><button type="button" class="cell ${a.v}" data-name="${esc(t.name)}" data-v="${MARK[a.v][1]}"${a.note ? ` data-note="${esc(a.note)}"` : ''}${provAttrs(a, t)}${s} title="${esc([t.name + ': ' + MARK[a.v][1], a.note].filter(Boolean).join(' · '))}">${MARK[a.v][0]}</button></td>`
    : s ? `<td><button type="button" class="cell unk" data-name="${esc(t.name)}" data-v="Not checked yet"${s} aria-label="${esc(t.name)}: not checked yet">·</button></td>` : '<td><span class="fm unk" aria-label="Not checked yet">·</span></td>'; };
export function groupCompare(g, alts, closed = g.closed ?? []) {
  const tags = tagsOf(g); if (!tags.length || alts.length < 2) return '';
  const shut = closed.filter((c) => tags.some((t) => closedAnswerOf(c, t.id)));
  const gap = (t) => shut.some((c) => closedAnswerOf(c, t.id)?.v === 'yes') && alts.every((x) => answerOf(x.p.id, t.id)?.v !== 'yes') && alts.some((x) => answerOf(x.p.id, t.id));
  // WHY no "Closed apps" / "Open source" divider rows and the tag reads "Proprietary" (Destin, deck E-2, Nov 2): the tag on
  // each row already says it; the dividers were extra lines.
  return `<div class="cmpwrap" data-compare hidden><div class="cmpscroll"><table class="cmp"><thead><tr><th scope="col">${shut.length ? 'App' : 'Project'}</th>${tags.map((t) => `<th scope="col"${gap(t) ? ' class="gapcol"' : ''}><button type="button" class="cmph" data-q="${esc(t.question)}" data-m="${esc(t.meaning)}" data-name="${esc(t.name)}"${gap(t) ? ' data-gap="1"' : ''}>${esc(t.name)}</button>${gap(t) ? '<span class="gapmark">No open project yet</span>' : ''}</th>`).join('')}</tr></thead>
    <tbody>${shut.map((c) => `<tr class="closedrow"><th scope="row"><a href="${appUrl(c)}">${esc(c)}</a><span class="tag">Proprietary</span></th>${tags.map((t) => cmpCell(closedAnswerOf(c, t.id), t, c)).join('')}</tr>`).join('')}${alts.map((x) => `<tr data-pid="${esc(x.p.id)}"><th scope="row"><a href="${url(`p/${x.p.id}/`)}">${esc(x.p.name)}</a></th>${tags.map((t) => cmpCell(answerOf(x.p.id, t.id), t, x.p.name, `p:${x.p.id}`)).join('')}</tr>`).join('')}</tbody></table></div>
    <!-- WHY a key (Destin, structure deck: yes to "add a one-line key"): the marks were only explained by tapping. Same marks as the cells. -->
    <p class="cmpkey"><span class="fm yes" aria-hidden="true">✓</span><span>Yes</span><span class="fm partly" aria-hidden="true">~</span><span>Partly</span><span class="fm no" aria-hidden="true">✗</span><span>No</span><span class="fm unk" aria-hidden="true">·</span><span>Not checked yet</span>${shut.some((c) => tags.some((t) => closedAnswerOf(c, t.id)?.v === 'own')) ? '<span class="kp"><span class="fm own" aria-hidden="true">—</span> Its own format</span>' : ''}<span class="cmpkey-how">${SOCIAL ? 'Tap a mark to see its source or give your answer' : 'Tap a mark to see where it comes from'}</span></p><div class="callout info" data-cmp-none hidden>None of these have everything you picked.</div></div>
  <div class="callout info" data-must-none hidden>None of these have everything you picked.</div>`;
}

// Project page: ONE first-level card (Card levels), each tag a boxed row like a Settings row: its name at the left, Yes / Partly / No as a status Pill at the right,
// the note under the name in 12px grey with the source as a small link in that same line. Grouped under the group's name only when the project is listed in several groups.
// Tags nobody has checked yet are left out: a row that says nothing is not worth a row.
const PILL = { yes: ['ok', 'Yes', true], partly: ['warn', 'Partly', true], no: ['', 'No', false] };
export function projectFeatures(p, listed) {
  // WHY blank rows stay out (reviewer, Nov 3: rows of "Not checked yet" were the busiest addition): blanks are answered from the Compare table.
  const groups = listed.map(({ group }) => ({ group, rows: tagsOf(group).map((t) => ({ t, a: answerOf(p.id, t.id) })).filter((r) => r.a) })).filter((x) => x.rows.length);
  if (!groups.length) return '';
  // WHY the source at the row's right (reviewer, round 5): a "Source" line under every name repeated 20 times; now it is a small link on the same line as the Pill, and a row with no note is one line.
  // WHY the answer itself is the button once there's a server (step 2): it opens the same popup as a table mark.
  const row = ({ t, a }) => { const [tone, word, dot] = a ? PILL[a.v] : ['', 'Not checked yet', false]; const s = subjAttrs(`p:${p.id}`, p.name, t);
    const pill = s ? `<button type="button" class="pill pillbtn ${tone}${a ? '' : ' unk'}" data-name="${esc(t.name)}" data-v="${a ? MARK[a.v][1] : 'Not checked yet'}"${a?.note ? ` data-note="${esc(a.note)}"` : ''}${provAttrs(a, t)}${s}>${dot ? '<i></i>' : ''}${word}</button>` : `<span class="pill ${tone}">${dot ? '<i></i>' : ''}${word}</span>`;
    const label = a ? provLabel(a, t).replace('<button type="button" class="prov"', `<button type="button" class="prov"${s}`) : '';
    return `<div class="frowx"><div class="fx-main"><span class="fx-name" title="${esc(t.question)}">${esc(t.name)}</span>${a?.note ? `<span class="fx-note">${esc(a.note)}</span>` : ''}</div><div class="fx-end">${label}${pill}</div></div>`; };
  return `<section class="surface sec fold-phone rvfeat"><div class="sec-head fold-head"><div><h2 class="h-large">Features</h2></div></div>
    ${groups.map(({ group, rows }) => `${groups.length > 1 ? `<h3 class="label fx-group">${esc(group.name)}</h3>` : ''}<div class="fx-list">${rows.map(row).join('')}</div>`).join('')}</section>`;
}

// Gaps page: tags where every alternative that was asked says no ("Missing everywhere"), and where the best anyone says is "partly".
// WHY unknown never counts as no: a group only qualifies when EVERY alternative has an answer. WHY two or more alternatives: with one,
// "everywhere" would just mean "that one project".
// WHY the closed apps decide it now (evidence map §1, Nov 2): a feature is a gap when a closed app HAS it and open source doesn't;
// once a group's closed apps are researched, a feature none of them has is not a gap. Each row names the closed apps that have it.
export function gapsMissing(d) {
  const out = { none: [], partly: [] };
  for (const g of d.groups) {
    const alts = g.alternatives.map((a) => a.project).filter((id) => d.projById.has(id)); if (alts.length < 2) continue;
    const researched = (g.closed ?? []).some((c) => CLOSED[c]?.answers);
    for (const t of tagsOf(g)) {
      const v = alts.map((id) => answerOf(id, t.id)?.v);
      if (v.some((x) => !x)) continue;
      const kind = v.every((x) => x === 'no') ? 'none' : !v.includes('yes') ? 'partly' : null; if (!kind) continue;
      const has = (g.closed ?? []).filter((c) => closedAnswerOf(c, t.id)?.v === 'yes');
      if (researched && !has.length) continue;
      let e = out[kind].find((x) => x.g === g); if (!e) out[kind].push(e = { g, tags: [] }); e.tags.push({ t, has });
    }
  }
  const card = ({ g, tags }) => `<div class="card gcard"><div class="head"><h3><a class="crumb-strong" href="${url(`g/${g.id}/`)}">${esc(g.name)}</a></h3></div><ul class="gapfeat">${tags.map(({ t, has }) => `<li><span class="gf-name" title="${esc(t.question)}">${esc(t.name)}</span>${has.length ? `<span class="gf-has">${esc(has.join(', '))} ${has.length === 1 ? 'has' : 'have'} it</span>` : ''}</li>`).join('')}</ul><div class="gapbtns"><a class="btn sm secondary" href="${url(`g/${g.id}/?view=compare`)}">Compare</a></div></div>`;
  const sec = (id, title, desc, list) => (list.length ? `<section class="surface sec" id="${id}"><div class="sec-head"><div><h2 class="h-large">${title}<span class="count">${list.reduce((n, e) => n + e.tags.length, 0)}</span></h2><p class="desc12">${desc}</p></div></div><div class="gaplist">${list.map(card).join('')}</div></section>` : '');
  return sec('missing-everywhere', 'Features no open project has', 'Closed apps have these; every open alternative was checked and none does.', out.none)
    + sec('partly-anywhere', 'Features open source only partly has', 'Closed apps have these; the best open alternatives only partly do.', out.partly);
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

// The expandable card (FoldRow look, Destin round 5), identical on every project (reviewer, round 5): closed = "AI contributions" with the label as a Pill at the right (or "Not stated");
// open = description, their own words (quote + link), outside help and where to start (the contributing guide button), ALL inside the same box.
// `[data-ai-extra]` is filled in by contrib.js with the owner's contributor preferences, when they set some.
const AI_SHORT = { 'non-developers-welcome': 'Non-developers welcome', 'traditional-developers-only': 'Traditional developers only', 'not-accepted': 'Not accepted', 'see-policy': 'See policy' };
function aiFold(p, a, contributing) {
  const guide = a?.contributing ?? contributing;
  const issues = a?.goodFirstIssues;
  const start = [guide && `<a class="btn sm secondary" href="${esc(guide)}" rel="noopener">Read the contributing guide</a>`, issues && `<a class="btn sm secondary" href="${esc(issues)}" rel="noopener">Beginner issues</a>`].filter(Boolean);
  const help = a?.outsideHelp ? `<p><b>${HELP[a.outsideHelp]}.</b>${a.outsideHelpNote ? ` ${esc(a.outsideHelpNote)}` : ''}</p>` : '';
  const claim = `Maintainers can set this by ${SOCIAL ? `<a href="${claimHref(p)}">claiming the listing</a>` : 'claiming the listing'}.`;
  return `<details class="foldrow lvl1 aifold"><summary><span>AI contributions</span><span class="pill ${a?.label ? 'info' : ''}" data-ai-pill>${a?.label ? esc(AI_SHORT[a.label]) : 'Not stated'}</span></summary><div class="foldbody">
    ${a?.label ? `<p>${esc(a.description)}</p>` : `<p>The project has not said how it feels about AI-written contributions. ${claim}</p>`}
    ${a?.quote ? `<blockquote class="aiq">“${esc(a.quote)}”${a.source ? ` <a href="${esc(a.source)}" rel="noopener">Read it</a>` : ''}</blockquote>` : ''}
    ${help}
    <div data-ai-extra></div>
    ${start.length ? `<div class="aistart">${start.join('')}</div>` : ''}</div></details>`;
}

// Project page: How to help. The same shape on every project: the AI fold first, then the owner's preference rows (filled in by contrib.js), then the help links.
export function helpWithAi(p, rowsHtml, contributing) {
  const a = AI[p.id];
  // data-prefs: filled in by contrib.js with the owner's "How you'd like help" answers (rows) when they have set some.
  const slot = SOCIAL ? `<div class="prefs-slot" data-prefs data-project="${esc(p.id)}" hidden></div>` : '';
  return `<section class="surface sec fold-phone" id="help" data-tipscope><div class="sec-head fold-head"><div><h2 class="h-large">How to help</h2></div></div><div class="stack">${aiFold(p, a, contributing)}${slot}${rowsHtml}</div></section>`;
}
